import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { acquireLock, releaseLock } from "../lib/sessions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(__dirname, "..", "server.js");
const MOCK_CODEX = path.join(__dirname, "mock-codex.js");

/** MCP サーバーと newline-delimited JSON-RPC で通信する最小クライアント */
class McpClient {
  constructor(env = {}, cwd = undefined) {
    this.child = spawn(process.execPath, [SERVER], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = "";
    this.stderr = "";
    this.child.stderr.on("data", (d) => (this.stderr += d));
    this.child.stdout.on("data", (d) => {
      this.buffer += d;
      let idx;
      while ((idx = this.buffer.indexOf("\n")) >= 0) {
        const line = this.buffer.slice(0, idx).trim();
        this.buffer = this.buffer.slice(idx + 1);
        if (!line) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg.id != null && this.pending.has(msg.id)) {
          const { resolve } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          resolve(msg);
        }
      }
    });
  }

  send(method, params = {}, { notify = false } = {}) {
    const msg = { jsonrpc: "2.0", method, params };
    if (!notify) msg.id = this.nextId++;
    this.child.stdin.write(JSON.stringify(msg) + "\n");
    if (notify) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      this.pending.set(msg.id, { resolve, reject });
      setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), 30000).unref();
    });
  }

  async initialize() {
    await this.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "0.0.0" },
    });
    await this.send("notifications/initialized", {}, { notify: true });
  }

  callTool(name, args = {}) {
    return this.send("tools/call", { name, arguments: args });
  }

  close() {
    this.child.kill("SIGKILL");
  }
}

function makeTmpGitRepo(root, prefix) {
  const dir = fs.mkdtempSync(path.join(root, prefix));
  const git = (...a) =>
    execFileSync("git", ["-C", dir, ...a], { stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-q");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  fs.writeFileSync(path.join(dir, "base.txt"), "base\n");
  git("add", ".");
  git("commit", "-q", "-m", "init");
  return dir;
}

// CODEX_ALLOWED_ROOTS はこのディレクトリ配下にすべてのテスト用リポジトリを作る
const allowedRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "codex-mcp-allowed-")));
const outsideRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "codex-mcp-outside-")));
const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-mcp-int-state-"));

const clients = [];
function startClient(extraEnv = {}, cwd = undefined) {
  const c = new McpClient(
    {
      CODEX_BIN: MOCK_CODEX,
      CODEX_MCP_STATE_DIR: stateDir,
      CODEX_ALLOWED_ROOTS: allowedRoot,
      ...extraEnv,
    },
    cwd
  );
  clients.push(c);
  return c;
}

after(() => {
  for (const c of clients) c.close();
});

test("initialize → tools/list で3ツールが公開される", async () => {
  const c = startClient();
  await c.initialize();
  const res = await c.send("tools/list");
  const names = res.result.tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["codex_reply", "codex_status", "codex_task"]);
});

let sharedRepo;
let sharedSessionId;
let sharedWorktree;

test("codex_task: 専用worktreeで実行・Git前後比較で変更検出・session_id永続化", async () => {
  sharedRepo = makeTmpGitRepo(allowedRoot, "repo-");
  const c = startClient({ MOCK_WRITE_FILE: "hello.txt", MOCK_SESSION_ID: "sess-int-1" });
  await c.initialize();

  const res = await c.callTool("codex_task", {
    prompt: "hello.txt を作って",
    workdir: sharedRepo,
  });
  const text = res.result.content[0].text;
  assert.ok(!res.result.isError, `isError: ${text}`);
  assert.match(text, /session_id: sess-int-1/);
  assert.match(text, /追加: hello\.txt/);
  assert.match(text, /専用 worktree/);
  assert.match(text, /sandbox: workspace-write（固定）/);
  assert.match(text, /MOCK_REPLY\(new\)/);
  assert.match(text, /npm test.*exit 0/);
  assert.match(text, /input_tokens/);
  // worktree パスは元リポジトリと異なる
  const wtMatch = text.match(/worktree: (\S+)/);
  assert.ok(wtMatch);
  sharedWorktree = wtMatch[1];
  assert.notEqual(path.resolve(sharedWorktree), path.resolve(sharedRepo));
  assert.match(text, /branch: codex-mcp\//);

  sharedSessionId = "sess-int-1";

  const sessions = JSON.parse(fs.readFileSync(path.join(stateDir, "sessions.json"), "utf8"));
  assert.equal(sessions["sess-int-1"].execDir, sharedWorktree);
});

test("codex_reply: サーバー再起動後も再検証のうえ同一worktreeでresumeする", async () => {
  const c = startClient({}, os.tmpdir()); // 新しいサーバープロセス = 再起動相当、cwdも無関係な場所
  await c.initialize();

  const res = await c.callTool("codex_reply", {
    session_id: sharedSessionId,
    prompt: "テストが失敗した。修正して",
  });
  const text = res.result.content[0].text;
  assert.ok(!res.result.isError, `isError: ${text}`);
  assert.match(text, /MOCK_REPLY\(resume\)/);
  assert.ok(text.includes(`cwd=${sharedWorktree}`), `worktree が引き継がれていない: ${text}`);
});

test("codex_reply: 未知の session_id は明確なエラー", async () => {
  const c = startClient();
  await c.initialize();
  const res = await c.callTool("codex_reply", { session_id: "no-such-session", prompt: "x" });
  assert.equal(res.result.isError, true);
  assert.match(res.result.content[0].text, /見つかりません/);
});

test("codex_task: CODEX_ALLOWED_ROOTS 外の workdir は拒否", async () => {
  const repo = makeTmpGitRepo(outsideRoot, "outside-repo-");
  const c = startClient();
  await c.initialize();
  const res = await c.callTool("codex_task", { prompt: "x", workdir: repo });
  assert.equal(res.result.isError, true);
  assert.match(res.result.content[0].text, /許可済みルート外/);
});

test("codex_task: CODEX_ALLOWED_ROOTS 未設定なら全拒否", async () => {
  const repo = makeTmpGitRepo(allowedRoot, "repo-noroot-");
  const c = startClient({ CODEX_ALLOWED_ROOTS: "" });
  await c.initialize();
  const res = await c.callTool("codex_task", { prompt: "x", workdir: repo });
  assert.equal(res.result.isError, true);
  assert.match(res.result.content[0].text, /設定されていない/);
});

test("codex_task: symlink でルート外を指す workdir は拒否される", async () => {
  if (process.platform === "win32") return;
  const repo = makeTmpGitRepo(outsideRoot, "outside-repo2-");
  const linkPath = path.join(allowedRoot, "escape-link");
  fs.symlinkSync(repo, linkPath);
  const c = startClient();
  await c.initialize();
  const res = await c.callTool("codex_task", { prompt: "x", workdir: linkPath });
  assert.equal(res.result.isError, true);
  assert.match(res.result.content[0].text, /許可済みルート外/);
  fs.unlinkSync(linkPath);
});

test("codex_task: 非Gitディレクトリは拒否される", async () => {
  const dir = fs.mkdtempSync(path.join(allowedRoot, "nogit-"));
  const c = startClient();
  await c.initialize();
  const res = await c.callTool("codex_task", { prompt: "x", workdir: dir });
  assert.equal(res.result.isError, true);
  assert.match(res.result.content[0].text, /Git リポジトリではありません/);
});

test("codex_task: HEADなしリポジトリ（コミットなし）は worktree 作成に失敗しエラーを返す", async () => {
  const dir = fs.mkdtempSync(path.join(allowedRoot, "emptygit-"));
  execFileSync("git", ["-C", dir, "init", "-q"]);
  const c = startClient();
  await c.initialize();
  const res = await c.callTool("codex_task", { prompt: "x", workdir: dir });
  assert.equal(res.result.isError, true);
  assert.match(res.result.content[0].text, /worktree の作成に失敗/);
});

test("codex_task: prompt がバイト上限を超えると拒否される", async () => {
  const repo = makeTmpGitRepo(allowedRoot, "repo-bigprompt-");
  const c = startClient();
  await c.initialize();
  const bigPrompt = "あ".repeat(60000); // UTF-8で3バイト/文字 → 180,000バイト超
  const res = await c.callTool("codex_task", { prompt: bigPrompt, workdir: repo });
  assert.equal(res.result.isError === true || res.error != null, true);
});

test("codex_task: HEAD変化（worktree内コミット）を検出して報告する", async () => {
  const repo = makeTmpGitRepo(allowedRoot, "repo-commit-");
  const c = startClient({ MOCK_GIT_COMMIT: "1", MOCK_SESSION_ID: "sess-commit" });
  await c.initialize();
  const res = await c.callTool("codex_task", { prompt: "x", workdir: repo });
  const text = res.result.content[0].text;
  assert.ok(!res.result.isError, `isError: ${text}`);
  assert.match(text, /worktree内でコミットが作成されました/);
});

test("codex_task: push用資格情報が子プロセス環境に存在しない", async () => {
  const repo = makeTmpGitRepo(allowedRoot, "repo-envcheck-");
  const c = startClient({
    MOCK_PRINT_ENV: "1",
    MOCK_SESSION_ID: "sess-envcheck",
    GITHUB_TOKEN: "should-not-leak",
    SSH_AUTH_SOCK: "/tmp/should-not-leak.sock",
  });
  await c.initialize();
  const res = await c.callTool("codex_task", { prompt: "x", workdir: repo });
  const text = res.result.content[0].text;
  assert.ok(!res.result.isError, `isError: ${text}`);
  assert.match(text, /GITHUB_TOKEN_SET=false/);
  assert.match(text, /SSH_AUTH_SOCK_SET=false/);
  assert.match(text, /GIT_SSH_COMMAND=(false|cmd \/c exit 1)/);
});

test("codex_task: 同一worktreeの並列実行はロックで拒否される（resumeで再現）", async () => {
  process.env.CODEX_MCP_STATE_DIR = stateDir;
  acquireLock(sharedWorktree);
  try {
    const c = startClient({ MOCK_SESSION_ID: "sess-lock" });
    await c.initialize();
    const res = await c.callTool("codex_reply", { session_id: sharedSessionId, prompt: "x" });
    assert.equal(res.result.isError, true);
    assert.match(res.result.content[0].text, /別の Codex タスクが実行中/);
  } finally {
    releaseLock(sharedWorktree);
  }
});

test("codex_task: タイムアウトで強制終了し isError を返す", async () => {
  const repo = makeTmpGitRepo(allowedRoot, "repo-timeout-");
  const c = startClient({ MOCK_SLEEP_MS: "10000", CODEX_TIMEOUT_MS: "800" });
  await c.initialize();
  const res = await c.callTool("codex_task", { prompt: "x", workdir: repo });
  assert.equal(res.result.isError, true);
  assert.match(res.result.content[0].text, /タイムアウト/);
});

test("codex_status: モックでOK、CODEX_BIN不在なら日本語案内、フラグ欠落なら警告", async () => {
  const ok = startClient();
  await ok.initialize();
  const res1 = await ok.callTool("codex_status", {});
  assert.ok(!res1.result.isError);
  assert.match(res1.result.content[0].text, /Logged in using ChatGPT/);
  assert.match(res1.result.content[0].text, /--json=OK/);

  const missing = startClient({ CODEX_BIN: "/nonexistent/codex-binary" });
  await missing.initialize();
  const res2 = await missing.callTool("codex_status", {});
  assert.equal(res2.result.isError, true);
  assert.match(res2.result.content[0].text, /npm install -g @openai\/codex/);
  assert.match(res2.result.content[0].text, /codex login/);

  const oldCli = startClient({ MOCK_HELP_MISSING_JSON: "1" });
  await oldCli.initialize();
  const res3 = await oldCli.callTool("codex_status", {});
  assert.match(res3.result.content[0].text, /--json=見つからず/);
  assert.match(res3.result.content[0].text, /対応していない可能性/);
});
