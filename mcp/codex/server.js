#!/usr/bin/env node
/**
 * 自作 Codex MCP サーバー
 *
 * OpenAI API キーをユーザーが手入力せず、ChatGPT アカウント認証（`codex login`）
 * 済みの Codex CLI を `codex exec` 非対話モードで子プロセス実行するラッパー。
 *
 * 信頼モデル: ローカル・単一ユーザー・信頼済み環境を前提とする。
 * 共有環境・敵対的リポジトリ（プロンプトインジェクション等）を想定した
 * 強隔離（コンテナ/VM）は本フェーズのスコープ外。README を参照。
 *
 * 設計上の安全策:
 * - shell を介さず spawn(bin, argsArray) で起動（コマンド注入不可）
 * - sandbox は常に workspace-write を固定付与。ツール入力からの変更は不可
 * - CODEX_ALLOWED_ROOTS 配下（realpath 解決・path.relative 判定）以外の
 *   workdir は拒否。未設定時は全拒否（安全優先の既定）
 * - Codex の実行は元リポジトリとは別の専用 git worktree + タスク別ブランチで行い、
 *   push に使える資格情報を子プロセス環境から除去する（コミット/push 対策の主防御）。
 *   HEAD 監視はこれを補う多層防御であり、単独の防御機構ではない
 * - セッション（session_id → repoRoot/worktree/branch/model）をディスクに永続化し、
 *   resume 時は allowed root・git リポジトリ・canonical path を必ず再検証する
 * - 変更ファイルは Codex の自己申告ではなく、実行前後の Git 状態比較（SHA-256・
 *   porcelain v2・fail closed）で抽出する
 * - タイムアウト時はプロセスツリーごと kill、出力はサイズ上限つき
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { runCommand, parseCodexEvents } from "./lib/runner.js";
import { isGitRepo, getHead, snapshotWorkdir, diffSnapshots, SnapshotError } from "./lib/git.js";
import {
  saveSession,
  getSession,
  listSessions,
  acquireLock,
  releaseLock,
  listLocks,
} from "./lib/sessions.js";
import { createWorktree, listWorktrees, buildRestrictedEnv } from "./lib/worktree.js";

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
// mcp/codex/server.js から見て2階層上（<repo>/mcp/codex → <repo>）をプロジェクトルート
// の既定基準にする。MCP クライアントの起動 cwd には依存しない（ホスト実装依存の
// 不安定な基準を避けるため）。相対パス指定は絶対パス指定に劣後させ、README で推奨する。
const DEFAULT_RELATIVE_BASE = path.resolve(SERVER_DIR, "..", "..");

const CODEX_BIN = process.env.CODEX_BIN || "codex";
const DEFAULT_TIMEOUT_MS = Number(process.env.CODEX_TIMEOUT_MS || 600000);
const MAX_REPLY_CHARS = 30000;
const PROMPT_MAX_CHARS = 50000;
const PROMPT_MAX_BYTES = 150000;

const SETUP_GUIDE = [
  "Codex CLI のセットアップが必要です（OpenAI API キーの手入力は不要です）:",
  "  1. npm install -g @openai/codex",
  "  2. codex login  （ブラウザが開き ChatGPT アカウントでサインイン）",
  "  3. codex login status で「Logged in」になっていることを確認",
  "  ※ ChatGPT プランごとの利用上限が適用されます（無制限ではありません）",
].join("\n");

class ValidationError extends Error {}

function truncate(text, max = MAX_REPLY_CHARS) {
  if (!text || text.length <= max) return text ?? "";
  return text.slice(0, max) + `\n…（${text.length - max} 文字省略）`;
}

function errorResult(message) {
  return { content: [{ type: "text", text: message }], isError: true };
}

function describeSpawnError(e) {
  if (e?.code === "ENOENT") {
    return `Codex CLI（${CODEX_BIN}）が見つかりません。\n${SETUP_GUIDE}`;
  }
  return `Codex CLI の起動に失敗しました: ${e?.message ?? e}`;
}

function formatChanges(changes) {
  const lines = [];
  const put = (label, arr) => {
    if (arr.length > 0) lines.push(`  - ${label}: ${arr.join(", ")}`);
  };
  put("追加", changes.added);
  put("変更", changes.modified);
  put("削除", changes.deleted);
  put("巻き戻し", changes.reverted);
  return lines.length > 0 ? lines.join("\n") : "  - なし";
}

function stderrTail(stderr, max = 2000) {
  const t = (stderr ?? "").trim();
  if (!t) return "（標準エラー出力なし）";
  return t.length <= max ? t : "…" + t.slice(-max);
}

// ---- workdir 許可ルート検証 ---------------------------------------------

function getAllowedRoots() {
  const raw = process.env.CODEX_ALLOWED_ROOTS;
  if (!raw || !raw.trim()) return [];
  return raw
    .split(path.delimiter)
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => (path.isAbsolute(e) ? e : path.resolve(DEFAULT_RELATIVE_BASE, e)))
    .map((abs) => {
      try {
        return fs.realpathSync.native(abs);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function isWithinRoot(root, target) {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * 入力パスを許可ルート配下の実在ディレクトリとして検証し、realpath 解決済みの
 * 絶対パスを返す。未設定・範囲外・非存在はすべて ValidationError。
 * TOCTOU（検証後の symlink 差し替え）は単一ユーザー信頼環境の受容リスクとして
 * README に明記している（本関数だけでは防げない）。
 */
function validateAllowedWorkdir(inputPath) {
  const allowedRoots = getAllowedRoots();
  if (allowedRoots.length === 0) {
    throw new ValidationError(
      "CODEX_ALLOWED_ROOTS が設定されていないため、安全のため全ての workdir を拒否します。\n" +
        ".mcp.json の env に CODEX_ALLOWED_ROOTS（絶対パス推奨）を設定してください。"
    );
  }
  const raw = inputPath && inputPath.trim() ? inputPath : DEFAULT_RELATIVE_BASE;
  const abs = path.isAbsolute(raw) ? raw : path.resolve(DEFAULT_RELATIVE_BASE, raw);
  let canonical;
  try {
    canonical = fs.realpathSync.native(abs);
  } catch (e) {
    throw new ValidationError(`workdir が存在しないか解決できません: ${abs}（${e.message}）`);
  }
  if (!allowedRoots.some((root) => isWithinRoot(root, canonical))) {
    throw new ValidationError(
      `workdir が許可済みルート外です: ${canonical}\n許可ルート: ${allowedRoots.join(", ")}`
    );
  }
  return canonical;
}

function validateRepoRoot(inputPath) {
  const canonical = validateAllowedWorkdir(inputPath);
  return canonical;
}

async function assertGitRepo(dir, label) {
  if (!(await isGitRepo(dir))) {
    throw new ValidationError(`${label} が Git リポジトリではありません: ${dir}`);
  }
}

// ---- prompt 入力検証 ------------------------------------------------------

const promptSchema = z
  .string()
  .min(1, "prompt が空です")
  .max(PROMPT_MAX_CHARS, `prompt は最大 ${PROMPT_MAX_CHARS} 文字までです`)
  .refine((p) => Buffer.byteLength(p, "utf8") <= PROMPT_MAX_BYTES, {
    message: `prompt は UTF-8 で最大 ${PROMPT_MAX_BYTES} バイトまでです`,
  });

// ---- Codex 実行本体 --------------------------------------------------------

function formatCommands(commands) {
  if (!commands || commands.length === 0) return "  - なし";
  return commands
    .map((c) => `  - ${c.command ?? "(不明)"}  → exit ${c.exitCode ?? "?"} (${c.status ?? "?"})`)
    .join("\n");
}

async function execCodexInWorktree({ mode, sessionId, prompt, execDir, model, repoRoot, branch }) {
  const lockKey = execDir;
  const lock = acquireLock(lockKey, { sessionId: sessionId ?? null, mode });
  if (!lock.ok) {
    return errorResult(
      `同じセッション/worktree（${execDir}）で別の Codex タスクが実行中のため中止しました。\n` +
        `実行中: PID ${lock.holder.pid} / 開始 ${lock.holder.startedAt}\n` +
        "完了を待ってから再実行してください。"
    );
  }

  try {
    let before;
    try {
      before = await snapshotWorkdir(execDir);
    } catch (e) {
      if (e instanceof SnapshotError) {
        return errorResult(`実行前スナップショットの取得に失敗しました: ${e.message}`);
      }
      throw e;
    }
    const cleanAtStart = before.size === 0;
    const headBefore = await getHead(execDir);

    const args = ["exec"];
    if (mode === "resume") args.push("resume", sessionId);
    args.push("--json", "--sandbox", "workspace-write");
    if (model) args.push("-m", model);
    args.push(prompt);

    const restrictedEnv = buildRestrictedEnv(process.env);
    const result = await runCommand(CODEX_BIN, args, {
      cwd: execDir,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      env: restrictedEnv,
    });

    if (result.spawnError) {
      return errorResult(describeSpawnError(result.spawnError));
    }

    let after;
    try {
      after = await snapshotWorkdir(execDir);
    } catch (e) {
      if (e instanceof SnapshotError) {
        return errorResult(
          `実行後スナップショットの取得に失敗しました（変更内容は不明です）: ${e.message}`
        );
      }
      throw e;
    }
    const changes = diffSnapshots(before, after);
    const headAfter = await getHead(execDir);
    const parsed = parseCodexEvents(result.stdout);
    const newSessionId = mode === "resume" ? sessionId : parsed.sessionId;

    const failed = result.timedOut || result.code !== 0;

    const lines = [];
    lines.push(`## Codex 実行結果（${mode === "resume" ? "会話継続" : "新規タスク"}）`);
    lines.push(`- session_id: ${newSessionId ?? "（取得できず）"}`);
    lines.push(`- 実行場所（専用 worktree）: ${execDir}`);
    lines.push(`- sandbox: workspace-write（固定） / モデル: ${model ?? "Codex CLI 既定"}`);
    lines.push(
      `- 終了コード: ${result.code ?? "なし"}${result.timedOut ? "（タイムアウトで強制終了）" : ""} / 実行時間: ${(result.durationMs / 1000).toFixed(1)}s`
    );
    lines.push(`- 開始時のworktree: ${cleanAtStart ? "クリーン" : "変更あり（前回セッションの続き）"}`);
    lines.push("- Codex による変更ファイル（Git 前後比較・SHA-256）:");
    lines.push(formatChanges(changes));
    lines.push(`- HEAD: ${headBefore ?? "(なし)"} → ${headAfter ?? "(なし)"}${headBefore !== headAfter ? "（worktree内でコミットが作成されました）" : ""}`);
    lines.push("- Codex が実行したコマンド（JSONLログから機械抽出。自己申告テキストではない）:");
    lines.push(formatCommands(parsed.commands));
    if (parsed.usage) lines.push(`- トークン使用: ${JSON.stringify(parsed.usage)}`);
    if (result.stdoutTruncated) lines.push("- 注意: Codex の標準出力が上限(5MB)を超え切り捨てられました");
    if (parsed.unparsableLineCount > 0) {
      lines.push(
        `- 注意: JSON として解釈できない出力行が ${parsed.unparsableLineCount} 件ありました（CLI バージョン差の可能性）`
      );
    }
    if (parsed.errors.length > 0) lines.push(`- Codex 内部エラー: ${truncate(parsed.errors.join(" / "), 2000)}`);

    if (failed) {
      lines.push("");
      lines.push("### 失敗の詳細");
      if (result.timedOut) {
        lines.push(
          `タイムアウト（${DEFAULT_TIMEOUT_MS / 1000}s）。プロセスツリーを強制終了しました。` +
            " タスクを小さく分割するか、CODEX_TIMEOUT_MS を延長してください。"
        );
      }
      lines.push("標準エラー出力（末尾）:");
      lines.push("```");
      lines.push(stderrTail(result.stderr));
      lines.push("```");
      if (parsed.eventCount === 0 && !result.timedOut) {
        lines.push(`ヒント: ログインしていない可能性があります。\n${SETUP_GUIDE}`);
      }
    }

    if (newSessionId) {
      // セッションには「再開の起点」情報のみを保存する。プロンプト全文・環境変数は保存しない
      saveSession(newSessionId, { execDir, model: model ?? null, repoRoot, branch });
    }

    lines.push("");
    lines.push("### Codex からの応答（未検証・参考情報。事実確認は呼び出し元が行うこと）");
    lines.push(truncate(parsed.finalMessage ?? "（応答メッセージなし）"));

    return { content: [{ type: "text", text: lines.join("\n") }], isError: failed };
  } finally {
    releaseLock(lockKey);
  }
}

const server = new McpServer({ name: "codex", version: "0.2.0" });

server.tool(
  "codex_task",
  "新規タスクを Codex（ChatGPT/GPT-5系・APIキー手入力不要）に依頼する。実行は元リポジトリとは別の専用 git worktree + タスク別ブランチで行われ、push 用資格情報は与えられない（コミット・push はワークフロー規約で行わない設計。強制隔離であり検出ではない）。変更ファイルは Git 状態比較で抽出して返す。修正依頼は返ってきた session_id を codex_reply に渡すこと。統合（元リポジトリへの反映）は呼び出し元が worktree のブランチを明示的に merge/cherry-pick すること。",
  {
    prompt: promptSchema.describe("Codex への依頼内容（タスク契約を圧縮して渡す。最大50,000文字/150,000バイト）"),
    workdir: z
      .string()
      .optional()
      .describe("対象リポジトリのルート（Git リポジトリ必須、CODEX_ALLOWED_ROOTS 配下必須）。絶対パス推奨"),
    model: z
      .string()
      .optional()
      .describe("使用モデル（例: gpt-5-codex）。省略時は CODEX_MODEL 環境変数、それもなければ Codex CLI の既定モデル"),
  },
  async ({ prompt, workdir, model }) => {
    let repoRoot;
    try {
      repoRoot = validateRepoRoot(workdir);
      await assertGitRepo(repoRoot, "workdir");
    } catch (e) {
      if (e instanceof ValidationError) return errorResult(e.message);
      throw e;
    }

    let wt;
    try {
      wt = createWorktree(repoRoot);
    } catch (e) {
      return errorResult(`専用 worktree の作成に失敗しました: ${e.message}`);
    }

    const res = await execCodexInWorktree({
      mode: "new",
      prompt,
      execDir: wt.worktreePath,
      model: model ?? process.env.CODEX_MODEL ?? null,
      repoRoot,
      branch: wt.branch,
    });

    // 追加情報として worktree/branch を明示する（呼び出し元が統合するため必須）
    const header = [
      `worktree: ${wt.worktreePath}`,
      `branch: ${wt.branch}`,
      `統合方法の例: git -C ${repoRoot} merge --no-ff ${wt.branch}`,
      "",
    ].join("\n");
    res.content[0].text = header + res.content[0].text;
    return res;
  }
);

server.tool(
  "codex_reply",
  "既存の Codex セッションに返信して会話を継続する（設計判断が必要な修正など）。保存済みの worktree・モデルを自動で引き継ぐ。再開前に allowed root・git リポジトリ・パスの正当性を再検証する。テスト失敗の局所修正は、新しい codex_task に契約本文+差分+構造化失敗証跡を渡す fresh_delta 方式を推奨（履歴を引き継がず短く安定する）。",
  {
    session_id: z.string().min(1).describe("codex_task が返した session_id"),
    prompt: promptSchema.describe(
      "返信内容。設計判断の共有や広い文脈が必要な場合に使う。局所的なテスト失敗修正は fresh_delta（新規 codex_task）を推奨"
    ),
  },
  async ({ session_id, prompt }) => {
    const record = getSession(session_id);
    if (!record) {
      return errorResult(
        `session_id「${session_id}」の記録が見つかりません。\n` +
          "codex_task で新しいセッションを開始してください（一覧は codex_status で確認できます）。"
      );
    }

    // resume 時の再検証: 保存時から状態が変わっている可能性を前提に、毎回確認し直す。
    // execDir は worktree（本サーバーが管理する stateDir 配下）であり CODEX_ALLOWED_ROOTS
    // の対象ではないため、「元リポジトリ（repoRoot）が今も allowed root 配下の git
    // リポジトリであること」と「execDir が今もそのリポジトリの正規の worktree として
    // 登録されていること」の両方を確認する。
    let execDir, repoRoot;
    try {
      if (!record.repoRoot || !record.execDir) {
        throw new ValidationError("セッション記録が不完全です（repoRoot/execDir 欠落）。");
      }
      repoRoot = validateAllowedWorkdir(record.repoRoot);
      await assertGitRepo(repoRoot, "保存済みリポジトリ");

      try {
        execDir = fs.realpathSync.native(record.execDir);
      } catch (e) {
        throw new ValidationError(`保存済み worktree が見つかりません: ${record.execDir}（${e.message}）`);
      }
      await assertGitRepo(execDir, "保存済み worktree");

      const registered = listWorktrees(repoRoot).some((w) => {
        if (!w.worktree) return false;
        try {
          return fs.realpathSync.native(w.worktree) === execDir;
        } catch {
          return false;
        }
      });
      if (!registered) {
        throw new ValidationError(
          "保存済み worktree はリポジトリの worktree 一覧に存在しません（削除された可能性があります）。"
        );
      }
    } catch (e) {
      const msg = e instanceof ValidationError ? e.message : String(e?.message ?? e);
      return errorResult(
        `保存済みの実行先が再検証に失敗しました。worktree が削除された、CODEX_ALLOWED_ROOTS が変更された等の可能性があります。\n${msg}\n` +
          "新しい codex_task から開始してください。"
      );
    }

    return execCodexInWorktree({
      mode: "resume",
      sessionId: session_id,
      prompt,
      execDir,
      model: record.model ?? null,
      repoRoot,
      branch: record.branch,
    });
  }
);

server.tool(
  "codex_status",
  "Codex CLI のインストール状態・ログイン状態（ChatGPTアカウント認証）・対応フラグ（--json/--sandbox/resume）・許可ルート設定・保存済みセッション・実行中ロックを確認する。",
  {},
  async () => {
    const lines = ["## Codex MCP ステータス"];

    const ver = await runCommand(CODEX_BIN, ["--version"], { timeoutMs: 15000 });
    if (ver.spawnError) {
      lines.push(`- Codex CLI: 未インストール`);
      lines.push("");
      lines.push(describeSpawnError(ver.spawnError));
      return { content: [{ type: "text", text: lines.join("\n") }], isError: true };
    }
    lines.push(`- Codex CLI: ${ver.stdout.trim() || "バージョン不明"}`);

    const help = await runCommand(CODEX_BIN, ["exec", "--help"], { timeoutMs: 15000 });
    const helpText = help.stdout + help.stderr;
    const capabilities = ["--json", "--sandbox", "resume"].map((flag) => ({
      flag,
      ok: helpText.includes(flag),
    }));
    lines.push(
      `- 対応確認（codex exec --help）: ` +
        capabilities.map((c) => `${c.flag}=${c.ok ? "OK" : "見つからず"}`).join(" / ")
    );
    if (capabilities.some((c) => !c.ok)) {
      lines.push("  警告: このバージョンの Codex CLI は本サーバーが前提とするフラグに対応していない可能性があります。");
    }

    const login = await runCommand(CODEX_BIN, ["login", "status"], { timeoutMs: 15000 });
    const loggedIn = login.code === 0;
    lines.push(`- ログイン: ${loggedIn ? `OK（${login.stdout.trim() || "認証済み"}）` : "未ログイン"}`);
    if (!loggedIn) {
      lines.push("");
      lines.push(SETUP_GUIDE);
    }

    lines.push(`- 既定モデル: ${process.env.CODEX_MODEL ?? "Codex CLI 既定（CODEX_MODEL 未設定）"}`);

    const allowedRoots = getAllowedRoots();
    lines.push(
      `- CODEX_ALLOWED_ROOTS: ${allowedRoots.length > 0 ? allowedRoots.join(" , ") : "未設定（全ての workdir を拒否します）"}`
    );

    const sessions = listSessions();
    const ids = Object.keys(sessions);
    lines.push(`- 保存済みセッション: ${ids.length}件`);
    for (const id of ids.slice(-5)) {
      lines.push(`  - ${id} → ${sessions[id].execDir}（最終 ${sessions[id].updatedAt}）`);
    }

    const locks = listLocks();
    lines.push(`- 実行中ロック: ${locks.length}件`);
    for (const l of locks) {
      lines.push(`  - ${l.workdir}（PID ${l.pid} / 開始 ${l.startedAt}）`);
    }

    return { content: [{ type: "text", text: lines.join("\n") }], isError: !loggedIn };
  }
);

await server.connect(new StdioServerTransport());
