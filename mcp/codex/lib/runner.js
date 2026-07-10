import { spawn } from "node:child_process";

const MAX_STDOUT = 5 * 1024 * 1024; // 5MB
const MAX_STDERR = 5 * 1024 * 1024; // 5MB
const KILL_GRACE_MS = 5000;

/**
 * 子プロセスを shell を介さず（コマンド注入不可の形で）実行する。
 * - Unix: detached でプロセスグループを作り、タイムアウト/終了時はグループごと
 *   SIGTERM → (猶予後) SIGKILL
 * - Windows: プロセスグループの概念がないため `taskkill /PID <pid> /T /F` で
 *   子孫プロセスごと強制終了する
 * - stdout/stderr はサイズ上限つきで収集する（超過時は打ち切り）
 */
export function runCommand(bin, args, { cwd, timeoutMs = 600000, env } = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let stdout = Buffer.alloc(0);
    let stderr = "";
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve({
        stdout: stdout.toString("utf8"),
        stderr,
        stdoutTruncated,
        stderrTruncated,
        timedOut,
        durationMs: Date.now() - startedAt,
        ...result,
      });
    };

    let child;
    try {
      child = spawn(bin, args, {
        cwd,
        env: env ?? process.env,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e) {
      finish({ code: null, spawnError: e });
      return;
    }

    const killTree = (signal) => {
      if (process.platform === "win32") {
        try {
          spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
        } catch {
          /* ベストエフォート */
        }
        return;
      }
      try {
        process.kill(-child.pid, signal);
      } catch {
        try {
          child.kill(signal);
        } catch {
          /* すでに終了 */
        }
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killTree("SIGTERM");
      setTimeout(() => killTree("SIGKILL"), KILL_GRACE_MS).unref();
    }, timeoutMs);

    child.stdout.on("data", (d) => {
      if (stdout.length < MAX_STDOUT) {
        stdout = Buffer.concat([stdout, d]).subarray(0, MAX_STDOUT);
      } else {
        stdoutTruncated = true;
      }
    });
    child.stderr.on("data", (d) => {
      if (stderr.length < MAX_STDERR) stderr += d;
      else stderrTruncated = true;
    });

    child.on("error", (e) => {
      clearTimeout(timer);
      finish({ code: null, spawnError: e });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      finish({ code, signal, spawnError: null });
    });
  });
}

// 中継してよいイベント種別の allowlist。
// reasoning（思考過程）を含み得る種別は意図的に除外し、証跡として保存・転送しない。
const ALLOWED_TOP_EVENT_TYPES = new Set([
  "thread.started",
  "turn.completed",
  "turn.failed",
  "item.completed",
  "error",
]);
const ALLOWED_ITEM_TYPES = new Set(["agent_message", "command_execution", "file_change"]);
const ALLOWED_OLD_MSG_TYPES = new Set([
  "session_configured",
  "agent_message",
  "token_count",
  "error",
  "exec_command_begin",
  "exec_command_end",
]);
// 明示的に除外する（reasoning 等）— allowlist の裏付けとしてドキュメント化
const EXCLUDED_TYPES = new Set(["reasoning", "agent_reasoning", "agent_reasoning_delta", "item.started"]);

/**
 * `codex exec --json` の JSONL イベントストリームを allowlist に基づいて解析する。
 * - 許可されていないイベント種別（reasoning 等）は無視して保存・転送しない
 * - 未知の（allowlist にも exclude list にもない）イベント種別も無視して継続する
 *   （パース不能な行とは区別し、スキーマ拡張として黙って読み飛ばす）
 * - サーバーが返す「実行コマンド一覧・終了コード」は command_execution / exec_command_*
 *   イベントから機械的に再構成する。モデルの自由文の自己申告をそのまま採用しない
 */
export function parseCodexEvents(stdout) {
  const rawLines = stdout.split("\n").filter((l) => l.trim().length > 0);
  const events = [];
  const unparsable = [];

  for (const line of rawLines) {
    const t = line.trim();
    if (!t.startsWith("{")) {
      unparsable.push(line);
      continue;
    }
    try {
      events.push(JSON.parse(t));
    } catch {
      unparsable.push(line);
    }
  }

  let sessionId = null;
  const messages = [];
  const commands = [];
  let usage = null;
  const errors = [];
  let turnFailed = false;

  const findId = (ev) =>
    ev?.session_id ?? ev?.thread_id ?? ev?.session?.id ?? ev?.msg?.session_id ?? null;

  for (const ev of events) {
    sessionId = sessionId ?? findId(ev);

    const topType = ev.type;
    const oldMsgType = ev.msg?.type;

    if (topType && EXCLUDED_TYPES.has(topType)) continue;
    if (oldMsgType && EXCLUDED_TYPES.has(oldMsgType)) continue;

    if (topType && !ALLOWED_TOP_EVENT_TYPES.has(topType) && !oldMsgType) {
      continue; // 未知の新形式イベントは黙って無視
    }
    if (!topType && oldMsgType && !ALLOWED_OLD_MSG_TYPES.has(oldMsgType)) {
      continue; // 未知の旧形式イベントは黙って無視
    }

    if (topType === "item.completed") {
      const item = ev.item;
      if (item && ALLOWED_ITEM_TYPES.has(item.type)) {
        if (item.type === "agent_message" && typeof item.text === "string") {
          messages.push(item.text);
        } else if (item.type === "command_execution") {
          commands.push({
            command: item.command ?? null,
            exitCode: item.exit_code ?? item.exitCode ?? null,
            status: item.status ?? null,
          });
        }
      }
    } else if (oldMsgType === "agent_message" && typeof ev.msg.message === "string") {
      messages.push(ev.msg.message);
    } else if (oldMsgType === "exec_command_begin") {
      commands.push({ command: ev.msg.command ?? null, exitCode: null, status: "started" });
    } else if (oldMsgType === "exec_command_end") {
      const last = commands[commands.length - 1];
      const exitCode = ev.msg.exit_code ?? ev.msg.exitCode ?? null;
      if (last && last.exitCode === null && last.status === "started") {
        last.exitCode = exitCode;
        last.status = "completed";
      } else {
        commands.push({ command: ev.msg.command ?? null, exitCode, status: "completed" });
      }
    }

    if (topType === "turn.completed" && ev.usage) usage = ev.usage;
    if (topType === "turn.failed") turnFailed = true;
    if (oldMsgType === "token_count" && ev.msg?.info?.total_token_usage) {
      usage = ev.msg.info.total_token_usage;
    }

    if (topType === "error" || oldMsgType === "error") {
      errors.push(ev.message ?? ev.error?.message ?? ev.msg?.message ?? "unknown error");
    }
  }

  return {
    sessionId,
    finalMessage: messages.at(-1) ?? null,
    messages,
    commands,
    usage,
    errors,
    turnFailed,
    eventCount: events.length,
    unparsableLineCount: unparsable.length,
    unparsableSample: unparsable.slice(0, 3),
  };
}
