# Codex MCP サーバー

Claude Code から ChatGPT（Codex CLI / GPT-5系）を**サブエージェントとして**呼び出すための自作 MCP サーバー。
「Claude が指示 → Codex が実装 → Claude がテスト・修正指示 → 成果提出」という分業フローを実現する。

## 認証について（OpenAI API キーの手入力は不要）

このサーバーは OpenAI API を直接呼び出しません。**`codex login` で ChatGPT アカウントに OAuth
サインインした Codex CLI** を子プロセスとして実行するだけです。よって OpenAI API キーを手入力する
必要はありません。ただし ChatGPT のプラン（Plus/Pro など）に応じた**利用上限は適用されます**
（無制限に使えるわけではありません）。

## セットアップ

```bash
npm install -g @openai/codex
codex login          # ブラウザが開き ChatGPT アカウントでサインイン
codex login status    # "Logged in" になっていることを確認
cd mcp/codex && npm install
```

### サポート対象の Codex CLI バージョン

本サーバーは `codex exec --json`、`--sandbox`、`codex exec resume <id>` に依存します。
バージョンによって既定モデルやフラグの有無が変わるため、導入時に以下で確認してください:

```bash
codex --version
codex exec --help    # --json / --sandbox / resume が含まれているか確認
```

MCP の `codex_status` ツールも同じ確認を自動で行い、欠落があれば警告します。

## ツール

| ツール | 概要 |
|---|---|
| `codex_task` | 新規タスクを Codex に依頼する。実行は元リポジトリとは別の専用 `git worktree` + タスク別ブランチで行われる |
| `codex_reply` | 既存セッションに返信して会話を継続する（resume）。再開前に allowed root・git リポジトリ・パスを再検証する |
| `codex_status` | Codex CLI のインストール・ログイン状態・対応フラグ・許可ルート設定・セッション・ロックを確認する |

`codex_task` / `codex_reply` の `prompt` は最大 **50,000 文字かつ UTF-8 で 150,000 バイト**まで
（`String.length` は UTF-16 単位のためバイト数も別途チェックしている）。

## 環境変数

| 変数 | 既定値 | 説明 |
|---|---|---|
| `CODEX_BIN` | `codex` | Codex CLI の実行コマンド |
| `CODEX_MODEL` | （未設定）| 使用モデル。未設定なら Codex CLI 既定モデルを使用（`-m` を渡さない） |
| `CODEX_TIMEOUT_MS` | `600000` | 1回の実行タイムアウト（ミリ秒） |
| `CODEX_MCP_STATE_DIR` | `~/.codex-mcp` | セッション・ロック・worktree の保存先 |
| `CODEX_ALLOWED_ROOTS` | （未設定＝全拒否）| 実行を許可するディレクトリのルート（`path.delimiter` 区切り）。**絶対パス推奨**。相対パスは `server.js` の配置場所から2階層上（リポジトリルート想定）を基準に解決する |

`.mcp.json` では `CODEX_ALLOWED_ROOTS` を `"."`（= リポジトリルート）に設定済み。

## セキュリティ設計

### 信頼モデル

**ローカル・単一ユーザー・信頼済み環境**を前提とする。共有環境や、第三者が用意した敵対的な
リポジトリ（プロンプトインジェクション等）を扱う想定の強隔離（コンテナ/VM）は本フェーズの
スコープ外。将来的な拡張候補として位置づける。

### コミット・push 対策 = 検出ではなく隔離

`codex_task` は毎回、対象リポジトリとは別の **専用 `git worktree`** を作成し、その中で Codex を
実行する。加えて子プロセスの環境から push に使える資格情報を取り除く（`lib/worktree.js` の
`buildRestrictedEnv`）:

- `GIT_SSH_COMMAND` を必ず失敗するコマンドに固定し、SSH 経由の push を封じる
- `GIT_CONFIG_GLOBAL` / `GIT_CONFIG_SYSTEM` を無効化し、保存済み credential helper を読ませない
- `credential.helper` を空に強制上書き
- `GIT_TERMINAL_PROMPT=0` でプロンプト待ちにせず即失敗させる
- `GITHUB_TOKEN` / `GH_TOKEN` 等の既知トークン環境変数、`SSH_AUTH_SOCK` を除去

**HEAD の事前・事後比較は上記を補う多層防御であり、単独の防御機構ではない。** worktree 内で
コミットが作成されたこと自体は許容される想定（分業フローの一部）だが、push が外部に届かないよう
資格情報側で塞いでいる。

既知の残存リスク（対応対象外・受容している範囲）:
- リモート URL に資格情報が埋め込まれている場合（`https://<token>@host/...`）は本設計だけでは防げない
- `$HOME` は Codex CLI 自身の認証（`~/.codex/auth.json`）を壊さないため意図的に維持している。
  そのため `$HOME/.ssh` の鍵を git が agent 経由でなく直接使う経路は完全には塞がれていない
- worktree はリモート設定（`remote`）を元リポジトリと共有する（git の仕様上、worktree ごとに
  remote を独立させることはできない）ため、「remote を消す」のではなく「資格情報を渡さない」
  設計にしている

### `~/.codex/auth.json`（Codex CLI 自身の ChatGPT ログイン情報）の扱い

**本ラッパー（`server.js` / `lib/*.js`）自身は `~/.codex/auth.json` を読み取り・保存・コピー・
ログ出力しません。** ただし子プロセスとして起動する Codex CLI 自体は、通常どおりこのファイルを
読んで認証します（サーバーが一切関与しないという意味ではありません）。`auth.json` はアクセス
トークンを含む機密情報として扱ってください。

### workdir 検証

- `CODEX_ALLOWED_ROOTS` 未設定時は**全て拒否**（安全優先）
- 入力パスは `fs.realpathSync.native` で解決し、`path.relative(root, workdir)` が `..` で
  始まらず絶対パスでもないことを確認してから許可ルートと照合する
- **TOCTOU（検証後の symlink/junction 差し替え）は単一ユーザー信頼環境の受容リスク**として
  明記する。共有・敵対的環境では本設計は非対応
- workdir は Git リポジトリであることが必須。HEAD 未作成（空リポジトリ）は `codex_task` 実行時に
  worktree 作成が失敗するため、最初のコミットを作成してから利用する

### スナップショット・変更検出（`lib/git.js`）

- `git status --porcelain=v2 -z --untracked-files=all` を基にした前後比較で「Codex による変更」を
  抽出する（Codex の自己申告は使わない）
- ハッシュは **SHA-256**
- tracked ファイルはモード・シンボリックリンク・submodule 情報も含めてフィンガープリント化
- **fail closed 方針**: ハッシュ対象が読めない・読み取り中に変化した・特殊ファイル（FIFO 等）で
  ある場合は「変更なし」ではなく失敗として報告する
- 性能上限: 変更エントリ数 20,000件、合計サイズ 500MB、ハッシュ処理 60秒。超過時は安全側に倒して
  失敗させる。10MB超の個別ファイルはサイズ + mtime のみで比較する
- **ignored ファイルは変更検出の対象外。**「ignored だから安全」という意味ではない。
  `.env` や認証情報を prompt 経由で Codex に読ませないことは、本サーバーの検出機構とは別に、
  リポジトリ側の運用（`.gitignore`／周知）で担保すること

### JSONL イベント処理（`lib/runner.js`）

- `--json` 出力は **allowlist** に基づいて解析する。reasoning（思考過程）を含み得るイベント種別は
  意図的に除外し、保存・中継しない
- 実行コマンド一覧・終了コードは `command_execution` / `exec_command_*` イベントから機械的に
  再構成する。モデルの自由文の自己申告をそのまま採用しない
- 未知の（allowlist にも除外リストにもない）イベント種別は黙って無視する（スキーマ拡張への耐性）
- JSON として解釈できない行があった場合は件数を報告する

### プロセス管理

- タイムアウト時はプロセスツリーごと停止する（Unix: detached プロセスグループへ SIGTERM → 猶予後
  SIGKILL / Windows: `taskkill /PID <pid> /T /F`）
- 標準出力・標準エラー出力は各 5MB で打ち切る

### セッション・ロック（`lib/sessions.js`）

- session_id → `{ repoRoot, execDir(worktree), branch, model }` をディスクに永続化し、`codex_reply`
  では毎回 allowed root・git リポジトリ・worktree の正当性（`git worktree list` への登録有無）を
  再検証してから実行する
- 状態ファイルは一時ファイル + rename による原子的更新
- ロックは worktree 単位。保持プロセスの PID が死んでいる、または開始から30分以上経過している
  場合は stale とみなして奪取する（異常終了時の回収）
- 権限: Unix は状態ディレクトリ `0700`・ファイル `0600`。**Windows では `chmod` が同義の強制力を
  持たないため `icacls` による所有者限定 ACL の設定を試みる。設定に失敗した場合は警告を出力して
  処理を続行する（拒否はしない）**

## 動作確認

```bash
cd mcp/codex
npm test        # 単体・統合テスト（モック Codex CLI を使用、実ログイン不要）
node server.js  # 実サーバーの起動確認（Ctrl+C で終了）
```

実機での動作確認（`codex login` 済みの環境で）:

```
/codex-task 簡単なユーティリティ関数を作って
```
