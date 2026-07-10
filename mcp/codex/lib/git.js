import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// 性能上限（安全側に倒す: 超過時は「変更なし」ではなく失敗にする）
const MAX_ENTRIES = 20000;
const MAX_TOTAL_BYTES = 500 * 1024 * 1024; // 500MB
const MAX_HASH_MS = 60000;
const LARGE_FILE_BYTES = 10 * 1024 * 1024; // 10MB超はサイズ+mtimeのみで比較

class SnapshotError extends Error {}

function runGitSync(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "buffer", maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw new SnapshotError(`git 実行に失敗しました: ${r.error.message}`);
  return { code: r.status, stdout: r.stdout, stderr: r.stderr?.toString() ?? "" };
}

export async function isGitRepo(workdir) {
  const r = runGitSync(["rev-parse", "--is-inside-work-tree"], workdir);
  return r.code === 0 && r.stdout.toString().trim() === "true";
}

export async function getHead(workdir) {
  const r = runGitSync(["rev-parse", "HEAD"], workdir);
  if (r.code !== 0) return null; // 空リポジトリ（コミットなし）は null
  return r.stdout.toString().trim();
}

function hashBuffer(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * 単一ファイル（tracked/untracked 共通）のフィンガープリントを作る。
 * fail closed: 読めない・種別が不明・処理中に変化した場合は例外を投げ、
 * 呼び出し元はスナップショット全体を失敗として扱う（「変更なし」に倒さない）。
 */
function fingerprint(absPath, deadline) {
  if (Date.now() > deadline) {
    throw new SnapshotError("スナップショット処理がタイムアウトしました（ファイル数が多すぎる可能性）");
  }
  let st;
  try {
    st = fs.lstatSync(absPath);
  } catch (e) {
    if (e.code === "ENOENT") return { kind: "MISSING" };
    throw new SnapshotError(`stat に失敗しました (${absPath}): ${e.message}`);
  }

  if (st.isSymbolicLink()) {
    const target = fs.readlinkSync(absPath);
    return { kind: "SYMLINK", mode: st.mode & 0o777, hash: hashBuffer(Buffer.from(target)) };
  }
  if (st.isDirectory()) {
    return { kind: "DIR" };
  }
  if (!st.isFile()) {
    // FIFO・ソケット・デバイスファイル等: 内容比較不能なため fail closed
    throw new SnapshotError(`未対応のファイル種別です (${absPath})`);
  }
  if (st.size > LARGE_FILE_BYTES) {
    return { kind: "FILE_LARGE", mode: st.mode & 0o777, size: st.size, mtimeMs: st.mtimeMs };
  }
  let buf;
  try {
    buf = fs.readFileSync(absPath);
  } catch (e) {
    throw new SnapshotError(`読み取りに失敗しました (${absPath}): ${e.message}`);
  }
  // 読み取り前後でサイズが変わっていたら、レース中の変化とみなし fail closed
  let st2;
  try {
    st2 = fs.lstatSync(absPath);
  } catch (e) {
    throw new SnapshotError(`再 stat に失敗しました (${absPath}): ${e.message}`);
  }
  if (st2.size !== buf.length || st2.mtimeMs !== st.mtimeMs) {
    throw new SnapshotError(`読み取り中にファイルが変化しました (${absPath})`);
  }
  return { kind: "FILE", mode: st.mode & 0o777, hash: hashBuffer(buf) };
}

function fingerprintKey(fp) {
  if (!fp) return "MISSING";
  switch (fp.kind) {
    case "MISSING":
      return "MISSING";
    case "DIR":
      return "DIR";
    case "SYMLINK":
      return `SYMLINK:${fp.mode}:${fp.hash}`;
    case "FILE":
      return `FILE:${fp.mode}:${fp.hash}`;
    case "FILE_LARGE":
      return `FILE_LARGE:${fp.mode}:${fp.size}:${fp.mtimeMs}`;
    default:
      return "UNKNOWN";
  }
}

/**
 * `git status --porcelain=v2 -z --untracked-files=all --ignore-submodules=none` を解析し、
 * 変更のある全パス（tracked + untracked、rename の新旧両方）を列挙する。
 * v2 フォーマット: https://git-scm.com/docs/git-status#_porcelain_format_version_2
 *   "1 XY sub mH mI mW hH hI path"                 — ordinary changed entry
 *   "2 XY sub mH mI mW hH hI score path\0origPath"  — rename/copy entry
 *   "u XY sub m1 m2 m3 mW h1 h2 h3 path"            — unmerged
 *   "? path"                                        — untracked
 *   "! path"                                        — ignored（対象外）
 */
function parsePorcelainV2(stdout) {
  const entries = stdout.toString("utf8").split("\0").filter((e) => e.length > 0);
  const paths = new Set();
  let i = 0;
  while (i < entries.length) {
    const rec = entries[i];
    const type = rec[0];
    if (type === "1" || type === "u") {
      const fields = rec.split(" ");
      paths.add(fields.slice(type === "1" ? 8 : 10).join(" "));
      i += 1;
    } else if (type === "2") {
      const fields = rec.split(" ");
      const p = fields.slice(9).join(" ");
      paths.add(p);
      i += 1;
      // 次のエントリが原パス（NUL 区切りの次要素）
      if (i < entries.length) {
        paths.add(entries[i]);
        i += 1;
      }
    } else if (type === "?") {
      paths.add(rec.slice(2));
      i += 1;
    } else if (type === "!") {
      // ignored — 変更検出の対象外（README: 「ignored だから安全」ではない旨を明記）
      i += 1;
    } else {
      i += 1;
    }
  }
  return paths;
}

/**
 * 作業ツリーの未コミット変更を path → フィンガープリント文字列 の Map として記録する。
 * Codex 実行の前後でこの Map を比較し、実行による変更だけを既存の未コミット変更と
 * 区別して抽出するために使う。fail closed: 上限超過・読み取り不能時は例外を投げる。
 */
export async function snapshotWorkdir(workdir) {
  const r = runGitSync(
    ["status", "--porcelain=v2", "-z", "--untracked-files=all", "--ignore-submodules=none"],
    workdir
  );
  if (r.code !== 0) {
    throw new SnapshotError(`git status に失敗しました: ${r.stderr.trim()}`);
  }
  const paths = parsePorcelainV2(r.stdout);
  if (paths.size > MAX_ENTRIES) {
    throw new SnapshotError(
      `変更ファイル数が上限（${MAX_ENTRIES}）を超えました。安全のためスナップショットを中止します。`
    );
  }

  const deadline = Date.now() + MAX_HASH_MS;
  const snapshot = new Map();
  let totalBytes = 0;
  for (const p of paths) {
    const abs = path.join(workdir, p);
    const fp = fingerprint(abs, deadline);
    if (fp.kind === "FILE" || fp.kind === "FILE_LARGE") {
      totalBytes += fp.size ?? 0;
      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new SnapshotError(
          `変更ファイルの合計サイズが上限（${MAX_TOTAL_BYTES}バイト）を超えました。安全のためスナップショットを中止します。`
        );
      }
    }
    snapshot.set(p, fingerprintKey(fp));
  }
  return snapshot;
}

/**
 * 実行前後のスナップショットを比較し、実行によって生じた変更のみを返す。
 */
export function diffSnapshots(before, after) {
  const added = [];
  const modified = [];
  const deleted = [];
  const reverted = [];

  for (const [file, fp] of after) {
    if (!before.has(file)) {
      if (fp === "MISSING") deleted.push(file);
      else added.push(file);
    } else if (before.get(file) !== fp) {
      if (fp === "MISSING") deleted.push(file);
      else modified.push(file);
    }
  }
  for (const file of before.keys()) {
    if (!after.has(file)) reverted.push(file);
  }
  return {
    added: added.sort(),
    modified: modified.sort(),
    deleted: deleted.sort(),
    reverted: reverted.sort(),
  };
}

export { SnapshotError };
