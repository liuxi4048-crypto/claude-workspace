import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";

/**
 * セッション永続化とワークディレクトリ排他ロック。
 *
 * セッションは session_id → { workdir, model } をディスクに保存する。
 * MCP サーバーが再起動しても codex_reply が必ず元の workdir・モデルで
 * 再開できるようにする。ただし呼び出し元（server.js）は resume 時に
 * allowed root / git リポジトリ / canonical path を必ず再検証すること
 * （保存時から状態が変わっている可能性を前提にする）。
 *
 * ロックは workdir 単位。プロセスが死んでいる stale ロックは奪取する。
 *
 * 権限:
 * - Unix: 状態ディレクトリ 0700、ファイル 0600
 * - Windows: chmod は同義の強制力を持たないため icacls で所有者限定 ACL を
 *   試みる。設定に失敗した場合は警告を stderr に出して処理は続行する
 *   （＝拒否ではなく警告続行。README に明記）
 */

export function stateDir() {
  return process.env.CODEX_MCP_STATE_DIR || path.join(os.homedir(), ".codex-mcp");
}

const sessionsFile = () => path.join(stateDir(), "sessions.json");
const locksDir = () => path.join(stateDir(), "locks");

function warn(msg) {
  process.stderr.write(`[codex-mcp] ${msg}\n`);
}

function restrictToOwnerWindows(targetPath) {
  try {
    const username = `${os.userInfo().username}`;
    const r = spawnSync(
      "icacls",
      [targetPath, "/inheritance:r", "/grant:r", `${username}:(OI)(CI)F`],
      { stdio: "ignore" }
    );
    if (r.status !== 0) {
      warn(`icacls による権限制限に失敗しました（続行します）: ${targetPath}`);
    }
  } catch (e) {
    warn(`icacls の実行に失敗しました（続行します）: ${e.message}`);
  }
}

function ensureDirSecure(dir) {
  fs.mkdirSync(dir, { recursive: true });
  if (process.platform === "win32") {
    restrictToOwnerWindows(dir);
  } else {
    try {
      fs.chmodSync(dir, 0o700);
    } catch (e) {
      warn(`chmod 0700 に失敗しました（続行します）: ${dir}: ${e.message}`);
    }
  }
}

function secureFilePermissions(filePath) {
  if (process.platform === "win32") {
    restrictToOwnerWindows(filePath);
  } else {
    try {
      fs.chmodSync(filePath, 0o600);
    } catch (e) {
      warn(`chmod 0600 に失敗しました（続行します）: ${filePath}: ${e.message}`);
    }
  }
}

/** 一時ファイル + rename による原子的書き込み */
function atomicWrite(filePath, content) {
  ensureDirSecure(path.dirname(filePath));
  const tmp = filePath + "." + randomUUID() + ".tmp";
  fs.writeFileSync(tmp, content);
  secureFilePermissions(tmp);
  fs.renameSync(tmp, filePath);
}

function loadAll() {
  try {
    return JSON.parse(fs.readFileSync(sessionsFile(), "utf8"));
  } catch {
    return {};
  }
}

export function saveSession(sessionId, record) {
  const all = loadAll();
  all[sessionId] = {
    ...all[sessionId],
    ...record,
    updatedAt: new Date().toISOString(),
  };
  atomicWrite(sessionsFile(), JSON.stringify(all, null, 2));
}

export function getSession(sessionId) {
  return loadAll()[sessionId] ?? null;
}

export function listSessions() {
  return loadAll();
}

function lockPath(workdir) {
  const key = createHash("sha256").update(path.resolve(workdir)).digest("hex");
  return path.join(locksDir(), key + ".json");
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * stale ロックの判定: 保持プロセスの PID が死んでいれば無条件に stale。
 * PID が生きていても、記録された開始時刻から STALE_AFTER_MS を超えていれば
 * （タイムアウトで kill されたのにロックファイルだけ残った等の異常終了ケースを
 * 回収するため）stale とみなす。
 */
const STALE_AFTER_MS = 30 * 60 * 1000; // 30分

function isStale(lockInfo) {
  if (!lockInfo || !lockInfo.pid) return true;
  if (!pidAlive(lockInfo.pid)) return true;
  const startedAt = Date.parse(lockInfo.startedAt ?? "");
  if (!Number.isNaN(startedAt) && Date.now() - startedAt > STALE_AFTER_MS) return true;
  return false;
}

export function acquireLock(workdir, info = {}) {
  ensureDirSecure(locksDir());
  const p = lockPath(workdir);
  const payload = JSON.stringify(
    {
      pid: process.pid,
      workdir: path.resolve(workdir),
      startedAt: new Date().toISOString(),
      ...info,
    },
    null,
    2
  );
  const tmp = p + "." + randomUUID() + ".tmp";
  try {
    fs.writeFileSync(tmp, payload, { flag: "wx" });
  } catch (e) {
    throw new Error(`ロック用一時ファイルの作成に失敗しました: ${e.message}`);
  }
  secureFilePermissions(tmp);

  try {
    fs.linkSync(tmp, p);
    fs.unlinkSync(tmp);
    return { ok: true };
  } catch (e) {
    if (e.code !== "EEXIST") {
      fs.unlinkSync(tmp);
      throw e;
    }
  }

  let existing = null;
  try {
    existing = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    /* 壊れたロックファイルは stale 扱い */
  }
  if (!isStale(existing)) {
    fs.unlinkSync(tmp);
    return { ok: false, holder: existing };
  }
  // stale ロックを奪取（原子的に置き換え）
  fs.renameSync(tmp, p);
  return { ok: true, stale: true };
}

export function releaseLock(workdir) {
  try {
    fs.unlinkSync(lockPath(workdir));
  } catch {
    /* すでに解放済み */
  }
}

export function listLocks() {
  try {
    return fs
      .readdirSync(locksDir())
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(locksDir(), f), "utf8"));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}
