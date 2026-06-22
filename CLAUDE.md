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