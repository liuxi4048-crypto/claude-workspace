---
name: codex-task
description: ChatGPT（Codex/GPT-5系）との分業フローを起動する。Claude が仕様化・判定 → Codex が実装（専用worktree隔離） → Claude が差分検証 → 成果提出（作業ログ + worktree内コミット）まで自動化。APIキー手入力不要（codex login の ChatGPT アカウント認証を使用）。
triggers:
  - /codex-task
  - codexに作らせて
  - chatgptに実装させて
---

# Codex 分業フロー起動プロトコル

`/codex-task <タスク内容>` で起動。以下を順番に実行する。

## STEP 1 — 事前チェック

1. `codex_status` を呼び、Codex CLI のインストール・ログイン・対応フラグを確認する。
   - 未インストール／未ログインならセットアップ手順（`npm install -g @openai/codex` → `codex login`）
     を案内して**中断**する。
   - 対応フラグの警告が出た場合はユーザーに CLI 更新を促し、続行するかどうか確認する。
2. Codex の実行は**元リポジトリとは別の専用 worktree**で行われる設計であることを踏まえ、
   元リポジトリの作業ツリー状態は本フローの実行対象外（Codex が直接触ることはない）。

## STEP 2 — codex-worker に委譲

`codex-worker` サブエージェント（`.claude/agents/codex-worker.md`）を Agent tool で起動し、
タスク内容と対象リポジトリ（workdir）を渡す。受入条件が曖昧な場合は委譲前に自分で定義して含める。

ワーカーは「タスク契約作成 → codex_task → 判定に寄せた検証 → 失敗時 fresh_delta/resume の使い分け
→ 進捗ベース予算で停止 → 成果サマリ」のループを回して報告する。

## STEP 3 — 最終検証（メイン Claude の仕事）

ワーカーの報告を鵜呑みにせず:
1. 報告された worktree パスで `git diff` を確認する
2. **フルテスト**（プロジェクト全体のテストスイート）を一度だけ実行する
3. タスクの受入条件を満たしているか確認する
4. 簡単なセキュリティ上の懸念（意図しない外部通信・危険なコマンド実行等）がないか diff を確認する

不合格なら、追加の修正を（ワーカー経由の fresh_delta/resume または自分で worktree 内を直接編集）行う。

## STEP 4 — 成果提出

1. **作業ログを保存**する（CLAUDE.md の規約どおり）:
   - パス: `work_logs/YYYY-MM-DD_HH-MM_<概要>.md`
   - 内容: 実施内容 / worktree・branch / 変更ファイル / テスト結果 / Codex との往復回数 / 決定事項 / 次のアクション
2. **worktree 内でコミット**（以下の条件をすべて満たす場合のみ）:
   - worktree 内でテストが合格している
   - `git -C <worktree> status` がコミット対象として妥当な変更のみを含む
   - 条件を満たさない場合はコミットせず、理由を報告して**ユーザーに委ねる**
3. **元リポジトリへの統合**: worktree のブランチを元リポジトリに反映するかはユーザー判断。
   反映する場合の例:
   ```
   git -C <元リポジトリ> merge --no-ff <branch>
   ```
   これは通常の `git` 操作としてメイン Claude が直接行ってよいが、**マージ後の `push` は必ず
   ユーザー確認を取ってから**行う（PR 作成も同様）。

## STEP 5 — 完了報告

```
【Codex 分業フロー完了】
- タスク: <内容>
- worktree: <パス> / branch: <branch名>
- Codex との往復: X回（session_id: xxx、打ち切り理由があれば記載）
- テスト: 合格 / 不合格（詳細）
- 変更ファイル: ...
- 作業ログ: work_logs/...
- worktree内コミット: 済（<hash>）/ 未実施（理由）
- 元リポジトリへの統合: 未実施（ユーザー確認待ち）/ 実施済み（<hash>）
```
