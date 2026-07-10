# 作業ログ: Codex（ChatGPT/GPT-5系）MCPサブエージェントの自作

**日時**: 2026-07-10 08:01 JST
**担当**: Claude（Codex MCPサーバー実装）
**種別**: 実装
**ステータス**: 完了

---

## 実施内容

- 「Claude が指示 → ChatGPT(Codex) が実装 → Claude がテスト・修正 → 成果提出」の分業フローを
  自作 MCP サーバーとして実装した。
- OpenAI API キーを手入力せず、`codex login`（ChatGPT アカウント OAuth）済みの Codex CLI を
  `codex exec` 非対話モードで子プロセス実行するラッパー方式を採用。
- 複数回のレビューで指摘されたセキュリティ・堅牢性上の問題（セッション永続化とworkdir固定、
  Git前後比較による変更検出、fail closed方針、コミット/push対策の隔離設計、resume再検証、
  進捗ベースの往復予算、タスク契約の必須渡しなど）を反映し、最終的に以下を実装:
  - Codex 実行を元リポジトリと分離した専用 `git worktree` + タスク別ブランチで行い、
    子プロセス環境から push 用資格情報（SSH・credential helper・トークン）を除去
  - `CODEX_ALLOWED_ROOTS`（realpath検証・未設定時全拒否）による workdir 制限
  - `git status --porcelain=v2` + SHA-256 + fail closed によるGit変更スナップショット
  - JSONLイベントの allowlist パース（reasoning除外、コマンド実行ログの機械抽出）
  - セッション/ロックの原子的更新・stale lock回収・Windows ACL対応
  - resume時のallowed root・gitリポジトリ・worktree登録の再検証
- `codex-worker` サブエージェントと `/codex-task` スキルを整備し、タスク契約・fresh_delta/resume
  使い分け・構造化失敗証跡・進捗ベース停止判定のフローを定義。
- 単体・統合テスト26件を作成し全件合格を確認。実サーバーでの stdio スモークテスト
  （initialize→tools/list、codex未インストール時の日本語案内）も実測済み。

## 変更・作成したファイル

- `mcp/codex/server.js` — MCPサーバー本体（3ツール: codex_task/codex_reply/codex_status）
- `mcp/codex/lib/runner.js` — 子プロセス実行・JSONLイベントallowlistパース
- `mcp/codex/lib/git.js` — porcelain v2 + SHA-256 + fail closed のスナップショット/差分
- `mcp/codex/lib/sessions.js` — セッション永続化・排他ロック・権限管理
- `mcp/codex/lib/worktree.js` — 専用worktree作成・push資格情報を除去した実行環境構築
- `mcp/codex/test/` — 単体テスト・統合テスト・モックCodex CLI（26件、全合格）
- `mcp/codex/README.md` — セットアップ・セキュリティ設計の説明
- `mcp/codex/package.json` — 依存定義
- `.mcp.json` — codex MCPサーバー登録（CODEX_ALLOWED_ROOTS設定込み）
- `.claude/agents/codex-worker.md` — 分業ループを実行するサブエージェント定義
- `.claude/skills/codex-task/SKILL.md` — `/codex-task` 起動プロトコル
- `.claude/settings.local.json` — codex MCPツールの許可リスト追加
- `.env.example` — CODEX_MODEL等の任意設定を追記
- `CLAUDE.md` — 「Codex分業フロー」セクションを追記

## 決定事項

- APIキー不要を実現するため、OpenAI APIを直接叩かず Codex CLI のChatGPTログインをラップする方式を採用
- コミット/push対策は「HEAD監視による事後検出」ではなく「専用worktree + 資格情報非付与による事前隔離」を主防御とし、HEAD監視は補助的な多層防御に位置づけた
- CODEX_ALLOWED_ROOTS は未設定時に全拒否する安全側の既定とした
- sandboxは常に workspace-write に固定し、ツール入力からの変更を受け付けない設計とした
- 最終的な元リポジトリへの統合（merge）とpushはこのMCPサーバーの範囲外とし、ユーザー確認を経る手動操作として明確化した

## 次のアクション

- ユーザー環境で `npm install -g @openai/codex && codex login` を実施
- `cd mcp/codex && npm install` の後、`/codex-task <タスク>` で実機E2Eを確認
- 本コミットは push していない。内容確認後、ユーザーの承認を得てから `git push` する

## 関連Issue / PR

- なし（ユーザーからの直接依頼によるチャット内実装）
