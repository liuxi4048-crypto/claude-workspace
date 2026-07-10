# モロミーカンパニー（仮）ワークスペース

## COO 常駐体制

このワークスペースでは COO（最高執行責任者）が常駐エージェントとして機能します。

### 起動方法
- `/coo` と入力するだけで起動（CLI版・アプリ版どちらでも動作）

### 起動時の自動フロー
1. GitHub の project-team/coo.md からペルソナを読み込む
2. D:\claude-workspace\daily_reports\ の最新日報を確認
3. D:\claude-workspace\work_logs\ の直近3件の作業ログを確認
4. GitHub Issues / Linear の未完了タスクを確認
5. 継続作業あり → 確認なしで自動再開
6. 新規タスクあり → 最優先を自動実行（P0/P1のみユーザー確認）
7. 何もなし → 推奨アクションを提示して指示を待つ

### 保存されるファイル

| 種類 | ローカル | GitHub |
|------|---------|--------|
| 日報（1日1件） | daily_reports/YYYY-MM-DD.md | project-team/daily_reports/YYYY-MM-DD.md |
| 作業ログ（タスク完了ごと） | work_logs/YYYY-MM-DD_HH-MM_<概要>.md | project-team/work_logs/YYYY-MM-DD_HH-MM_<概要>.md |

### 作業ログの自動保存タイミング
- タスク・Issue・機能実装が完了したとき
- 重要な設計決定を行ったとき
- エラーの調査・解決が完了したとき
- メンバーへのバトンタッチを行ったとき

### チームメンバー定義
- リポジトリ: https://github.com/liuxi4048-crypto/claude-workspace/tree/master/project-team
- COOペルソナ: project-team/coo.md
- 起動スクリプト: project-team/launch/

### エスカレーションポリシー
- P0（即座）: セキュリティ・本番障害 → 即座にユーザーへ報告
- P1（当日）: 5万円超の予算・新規契約 → ユーザー承認必要
- P2（日報）: 遅延・方針変更 → 日報で報告
- P3（不要）: 日常業務 → チームで自律完結

## Codex 分業フロー（ChatGPT/GPT-5系・APIキー手入力不要）

Claude が指示し、ChatGPT（Codex CLI）が実装、Claude がテスト・修正指示を行う分業フロー。
実体は自作 MCP サーバー `mcp/codex/`（詳細: `mcp/codex/README.md`）。

### 起動方法
- `/codex-task <タスク内容>` と入力するだけで起動

### 前提
- `npm install -g @openai/codex` → `codex login`（ChatGPTアカウントでOAuthサインイン）済みであること
- OpenAI API キーの手入力は不要（ChatGPTプランの利用上限は適用される）

### フロー概要
1. Claude がタスク契約（目的・受入条件・変更可能ファイル等）を作成
2. Codex が**専用 git worktree**（元リポジトリとは分離、push用資格情報なし）で実装
3. Claude が差分レビュー・テストで判定
4. 失敗時は圧縮した失敗証跡で Codex に再依頼（進捗が出なければ早期打ち切り）
5. 合格後、work_logs/ に記録し worktree 内でコミット。**元リポジトリへの統合・push はユーザー確認後**

詳細は `.claude/skills/codex-task/SKILL.md`、`.claude/agents/codex-worker.md` を参照。