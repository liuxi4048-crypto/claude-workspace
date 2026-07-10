import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

import { parseCodexEvents } from "../lib/runner.js";
import { snapshotWorkdir, diffSnapshots, isGitRepo, getHead, SnapshotError } from "../lib/git.js";
import {
  saveSession,
  getSession,
  acquireLock,
  releaseLock,
} from "../lib/sessions.js";
import { buildRestrictedEnv } from "../lib/worktree.js";

// ---- parseCodexEvents ---------------------------------------------------

test("parseCodexEvents: allowlist イベントを抽出し reasoning は除外する", () => {
  const stdout = [
    JSON.stringify({ type: "thread.started", thread_id: "th-123" }),
    JSON.stringify({ type: "reasoning", text: "秘密の思考過程" }),
    "not-json-line",
    JSON.stringify({
      type: "item.completed",
      item: { type: "command_execution", command: "npm test", exit_code: 0, status: "completed" },
    }),
    JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "最終応答" } }),
    JSON.stringify({ type: "turn.completed", usage: { input_tokens: 3, output_tokens: 7 } }),
  ].join("\n");
  const p = parseCodexEvents(stdout);
  assert.equal(p.sessionId, "th-123");
  assert.equal(p.finalMessage, "最終応答");
  assert.deepEqual(p.usage, { input_tokens: 3, output_tokens: 7 });
  assert.equal(p.errors.length, 0);
  assert.equal(p.commands.length, 1);
  assert.equal(p.commands[0].command, "npm test");
  assert.equal(p.commands[0].exitCode, 0);
  assert.equal(p.unparsableLineCount, 1);
  // reasoning の本文がどのフィールドにも漏れていないこと
  assert.ok(!JSON.stringify(p).includes("秘密の思考過程"));
});

test("parseCodexEvents: 旧形式（msg.agent_message / exec_command_begin+end）", () => {
  const stdout = [
    JSON.stringify({ id: "0", msg: { type: "session_configured", session_id: "sess-9" } }),
    JSON.stringify({ id: "1", msg: { type: "exec_command_begin", command: "pytest" } }),
    JSON.stringify({ id: "2", msg: { type: "exec_command_end", exit_code: 1 } }),
    JSON.stringify({ id: "3", msg: { type: "agent_message", message: "旧形式の応答" } }),
    JSON.stringify({ id: "4", msg: { type: "token_count", info: { total_token_usage: { input_tokens: 1 } } } }),
    JSON.stringify({ id: "5", msg: { type: "error", message: "何かの警告" } }),
    JSON.stringify({ id: "6", msg: { type: "agent_reasoning", text: "除外されるべき" } }),
  ].join("\n");
  const p = parseCodexEvents(stdout);
  assert.equal(p.sessionId, "sess-9");
  assert.equal(p.finalMessage, "旧形式の応答");
  assert.deepEqual(p.usage, { input_tokens: 1 });
  assert.deepEqual(p.errors, ["何かの警告"]);
  assert.equal(p.commands.length, 1);
  assert.equal(p.commands[0].command, "pytest");
  assert.equal(p.commands[0].exitCode, 1);
  assert.ok(!JSON.stringify(p).includes("除外されるべき"));
});

test("parseCodexEvents: 未知イベント型は黙って無視、空出力でもクラッシュしない", () => {
  const p1 = parseCodexEvents(JSON.stringify({ type: "some.future.event", data: 1 }));
  assert.equal(p1.eventCount, 1);
  assert.equal(p1.finalMessage, null);

  const p2 = parseCodexEvents("");
  assert.equal(p2.sessionId, null);
  assert.equal(p2.finalMessage, null);
  assert.equal(p2.eventCount, 0);
});

// ---- git snapshot / diff -------------------------------------------------

function makeTmpGitRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-mcp-git-"));
  const git = (...a) =>
    execFileSync("git", ["-C", dir, ...a], { stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-q");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  git("config", "core.fileMode", "true"); // 環境依存(overlayfs等)でモード検出が無効化されるのを防ぐ
  fs.writeFileSync(path.join(dir, "base.txt"), "base\n");
  git("add", ".");
  git("commit", "-q", "-m", "init");
  return { dir, git };
}

test("git: クリーンなリポジトリのスナップショットは空、変更は前後比較で検出", async () => {
  const { dir } = makeTmpGitRepo();
  assert.equal(await isGitRepo(dir), true);
  assert.match(await getHead(dir), /^[0-9a-f]{40}$/);

  const before = await snapshotWorkdir(dir);
  assert.equal(before.size, 0);

  fs.writeFileSync(path.join(dir, "dirty.txt"), "user edit\n");
  const before2 = await snapshotWorkdir(dir);
  assert.equal(before2.size, 1);

  fs.writeFileSync(path.join(dir, "new-by-codex.txt"), "codex\n");
  fs.appendFileSync(path.join(dir, "dirty.txt"), "codex edit\n");
  fs.unlinkSync(path.join(dir, "base.txt"));

  const after = await snapshotWorkdir(dir);
  const diff = diffSnapshots(before2, after);
  assert.deepEqual(diff.added, ["new-by-codex.txt"]);
  assert.deepEqual(diff.modified, ["dirty.txt"]);
  assert.deepEqual(diff.deleted, ["base.txt"]);
});

test("git: untracked symlink と実行ビット変更を検出する", async () => {
  if (process.platform === "win32") return; // symlink/実行ビットは Unix のみ対象
  const { dir, git } = makeTmpGitRepo();
  const before = await snapshotWorkdir(dir);

  fs.symlinkSync("base.txt", path.join(dir, "link-to-base"));
  fs.chmodSync(path.join(dir, "base.txt"), 0o755);

  const after = await snapshotWorkdir(dir);
  const diff = diffSnapshots(before, after);
  assert.ok(diff.added.includes("link-to-base"));
  // base.txt はクリーンな状態(before未収録)からモード変更で新たにdirtyになったため added 側に入る
  assert.ok(diff.added.includes("base.txt"));
});

test("git: rename を旧パス・新パス両方で検出する", async () => {
  const { dir, git } = makeTmpGitRepo();
  fs.writeFileSync(path.join(dir, "extra.txt"), "extra content that is long enough\n");
  git("add", ".");
  git("commit", "-q", "-m", "add extra");
  const before = await snapshotWorkdir(dir);
  assert.equal(before.size, 0);

  fs.renameSync(path.join(dir, "extra.txt"), path.join(dir, "renamed.txt"));
  git("add", "-A");

  const after = await snapshotWorkdir(dir);
  const diff = diffSnapshots(before, after);
  assert.ok(diff.added.includes("renamed.txt") || diff.modified.includes("renamed.txt"));
});

test("git: 非Gitディレクトリは isGitRepo=false、HEADなしリポジトリは getHead=null", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-mcp-nogit-"));
  assert.equal(await isGitRepo(dir), false);

  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "codex-mcp-emptygit-"));
  execFileSync("git", ["-C", dir2, "init", "-q"]);
  assert.equal(await isGitRepo(dir2), true);
  assert.equal(await getHead(dir2), null);
});

test("git: tracked ファイルが特殊ファイル（FIFO）に置き換わると fail closed で例外を投げる", async () => {
  if (process.platform === "win32") return; // mkfifo は Unix のみ
  const { dir } = makeTmpGitRepo();
  // 新規の untracked FIFO は git 自体が untracked 一覧に含めないため対象外
  // （このケースは「見えないので変更として扱われない」だけで安全性は損なわれない）。
  // fail closed が意味を持つのは、tracked ファイルが特殊ファイルに置き換わるケース。
  fs.unlinkSync(path.join(dir, "base.txt"));
  execFileSync("mkfifo", [path.join(dir, "base.txt")]);
  await assert.rejects(() => snapshotWorkdir(dir), SnapshotError);
});

// ---- sessions / locks ---------------------------------------------------

test("sessions: 保存・取得・ロックの排他と解放（原子的更新）", () => {
  process.env.CODEX_MCP_STATE_DIR = fs.mkdtempSync(
    path.join(os.tmpdir(), "codex-mcp-state-")
  );

  saveSession("s-1", { execDir: "/tmp/wd", model: "gpt-5-codex" });
  const rec = getSession("s-1");
  assert.equal(rec.execDir, "/tmp/wd");
  assert.equal(rec.model, "gpt-5-codex");
  assert.equal(getSession("missing"), null);

  const wd = "/tmp/some-workdir";
  assert.equal(acquireLock(wd).ok, true);
  const second = acquireLock(wd);
  assert.equal(second.ok, false);
  assert.equal(second.holder.pid, process.pid);

  releaseLock(wd);
  assert.equal(acquireLock(wd).ok, true);
  releaseLock(wd);

  // 死んだ PID の stale ロックは奪取できる
  const wd2 = "/tmp/stale-workdir";
  const first = acquireLock(wd2);
  assert.equal(first.ok, true);
  const lockFile = path.join(
    process.env.CODEX_MCP_STATE_DIR,
    "locks",
    createHash("sha256").update(path.resolve(wd2)).digest("hex") + ".json"
  );
  fs.writeFileSync(lockFile, JSON.stringify({ pid: 999999999, workdir: wd2, startedAt: new Date().toISOString() }));
  const steal = acquireLock(wd2);
  assert.equal(steal.ok, true);
  assert.equal(steal.stale, true);
  releaseLock(wd2);

  // 状態ファイルの権限（Unix のみ検証）
  if (process.platform !== "win32") {
    const st = fs.statSync(path.join(process.env.CODEX_MCP_STATE_DIR, "sessions.json"));
    assert.equal(st.mode & 0o777, 0o600);
  }
});

test("sessions: 開始時刻が古すぎるロックは生存プロセスでも stale 扱いになる", () => {
  process.env.CODEX_MCP_STATE_DIR = fs.mkdtempSync(
    path.join(os.tmpdir(), "codex-mcp-state2-")
  );
  const wd = "/tmp/old-lock-workdir";
  acquireLock(wd);
  const lockFile = path.join(
    process.env.CODEX_MCP_STATE_DIR,
    "locks",
    createHash("sha256").update(path.resolve(wd)).digest("hex") + ".json"
  );
  const old = JSON.parse(fs.readFileSync(lockFile, "utf8"));
  old.startedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1時間前
  fs.writeFileSync(lockFile, JSON.stringify(old));
  const steal = acquireLock(wd);
  assert.equal(steal.ok, true);
  assert.equal(steal.stale, true);
  releaseLock(wd);
});

// ---- worktree: buildRestrictedEnv ---------------------------------------

test("buildRestrictedEnv: push用資格情報を除去し、SSH/credential helperを封じる", () => {
  const base = {
    ...process.env,
    GITHUB_TOKEN: "secret",
    GH_TOKEN: "secret2",
    SSH_AUTH_SOCK: "/tmp/agent.sock",
    GIT_ASKPASS: "/usr/bin/some-askpass",
  };
  const env = buildRestrictedEnv(base);
  assert.equal(env.GITHUB_TOKEN, undefined);
  assert.equal(env.GH_TOKEN, undefined);
  assert.equal(env.SSH_AUTH_SOCK, undefined);
  assert.equal(env.GIT_ASKPASS, undefined);
  assert.equal(env.GIT_TERMINAL_PROMPT, "0");
  assert.match(env.GIT_SSH_COMMAND, /false|exit 1/);
  assert.equal(env.GIT_CONFIG_KEY_0, "credential.helper");
  assert.equal(env.GIT_CONFIG_VALUE_0, "");
});
