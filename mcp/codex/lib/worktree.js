import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { stateDir } from "./sessions.js";

/**
 * Codex 実行を隔離するための専用 git worktree + タスク別ブランチ、および
 * push を成立させないための環境変数隔離。
 *
 * 設計方針（重大な決定・README にも記載）:
 * - HEAD の事後比較「検出」だけでは、コミット・push・外部送信の後では手遅れになる。
 *   そのため Codex は常に元リポジトリとは別の worktree 上で実行し、
 *   push に使える資格情報（SSH agent・保存済み credential helper・トークン環境変数）
 *   を子プロセスの環境から取り除く。
 * - worktree は git の仕組み上、リモート設定（remote）を元リポジトリと共有する
 *   （worktree ごとの remote 独立設定はできない）。そのため「remote を消す」のではなく
 *   「資格情報を子プロセスに渡さない」ことで push を成立させない設計にしている。
 * - `~/.codex/auth.json`（Codex CLI 自身の ChatGPT ログイン情報）は本サーバーが
 *   関与しないため、$HOME はそのまま維持する。よって「$HOME 以下の SSH 鍵を
 *   git が直接読みに行くケース」は本設計の対象外の残存リスクとして README に明記する。
 */

function worktreesRoot() {
  return path.join(stateDir(), "worktrees");
}

function runGit(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  return { code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", error: r.error };
}

export function repoHasHead(repoRoot) {
  const r = runGit(["rev-parse", "--verify", "-q", "HEAD"], repoRoot);
  return r.code === 0;
}

/**
 * repoRoot（実行対象リポジトリ）から専用 worktree を作成する。
 * 戻り値: { id, worktreePath, branch }
 */
export function createWorktree(repoRoot) {
  if (!repoHasHead(repoRoot)) {
    throw new Error(
      "リポジトリにコミットがありません（HEAD 未作成）。最初のコミットを作成してから実行してください。"
    );
  }
  fs.mkdirSync(worktreesRoot(), { recursive: true });
  const id = randomUUID();
  const worktreePath = path.join(worktreesRoot(), id);
  const branch = `codex-mcp/${id}`;

  const r = runGit(["worktree", "add", "--quiet", "-b", branch, worktreePath, "HEAD"], repoRoot);
  if (r.code !== 0) {
    throw new Error(`git worktree add に失敗しました: ${r.stderr.trim() || r.error?.message}`);
  }
  return { id, worktreePath, branch };
}

/** worktree を破棄する（ベストエフォート。失敗しても例外は投げない） */
export function removeWorktree(repoRoot, worktreePath) {
  runGit(["worktree", "remove", "--force", worktreePath], repoRoot);
  runGit(["worktree", "prune"], repoRoot);
}

export function listWorktrees(repoRoot) {
  const r = runGit(["worktree", "list", "--porcelain"], repoRoot);
  if (r.code !== 0) return [];
  return r.stdout
    .split("\n\n")
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      const entry = {};
      for (const l of lines) {
        const [k, ...rest] = l.split(" ");
        entry[k] = rest.join(" ");
      }
      return entry;
    });
}

const NULL_DEVICE = process.platform === "win32" ? "NUL" : "/dev/null";
const FAILING_SSH_COMMAND = process.platform === "win32" ? "cmd /c exit 1" : "false";
const CREDENTIAL_ENV_KEYS = [
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "GITLAB_TOKEN",
  "BITBUCKET_TOKEN",
  "NPM_TOKEN",
  "GIT_ASKPASS",
  "SSH_ASKPASS",
  "SSH_AUTH_SOCK",
  "SSH_AGENT_PID",
];

/**
 * push に使える資格情報を持たない子プロセス環境を作る。
 * - SSH 経由の git 操作は GIT_SSH_COMMAND を必ず失敗するコマンドに固定して封じる
 * - グローバル/システムの gitconfig を読ませない（保存済み credential helper 対策）
 * - credential.helper を空に強制上書き
 * - GIT_TERMINAL_PROMPT=0 でプロンプト待ちにせず即失敗させる
 * - 既知のトークン系環境変数・SSH agent 関連変数を除去
 *
 * 既知の残存リスク（README に明記）: リモート URL に資格情報が埋め込まれている場合
 * （https://<token>@host/...）や $HOME/.ssh の鍵をエージェント経由でなく直接使う
 * 経路は、本設計だけでは防げない。$HOME は Codex CLI 自身の認証（auth.json）を
 * 壊さないため意図的に維持している。
 */
export function buildRestrictedEnv(baseEnv = process.env) {
  const env = { ...baseEnv };
  for (const key of CREDENTIAL_ENV_KEYS) delete env[key];

  env.GIT_TERMINAL_PROMPT = "0";
  env.GIT_SSH_COMMAND = FAILING_SSH_COMMAND;
  env.GIT_CONFIG_GLOBAL = NULL_DEVICE;
  env.GIT_CONFIG_SYSTEM = NULL_DEVICE;
  env.GIT_CONFIG_COUNT = "1";
  env.GIT_CONFIG_KEY_0 = "credential.helper";
  env.GIT_CONFIG_VALUE_0 = "";

  return env;
}
