# 作業ログ: AIコンテンツ工房プロジェクト立ち上げ

- 日時: 2026-07-19 04:07
- ブランチ: claude/claude-code-subscription-monetization-fw295g

## 目的

Claude Code サブスクを活用した収益プロジェクトの新規立ち上げ。
条件: 週5時間以下・スキルゼロから・3ヶ月以内に初売上（初売上が立てば成功のライン）。

## 実施内容

1. **事業設計**: 二本柱を採用
   - 主軸: Kindle出版（資産型・冊数を積む戦略）
   - サブ: ココナラ小型受託（即金・実績づくり、同時1件・月1件上限）
2. **市場リサーチ**: WebSearch で Kindle 日本市場を調査。汎用AI本は飽和、職種・世代特化ニッチが勝ち筋と判断。企画3案を作成（推奨: 小さなお店向けChatGPT活用術）
3. **成果物**（`projects/ai-content-factory/`）:
   - README.md（事業計画書・90日ロードマップ・KPI・規約チェックリスト）
   - progress.md（週次進捗管理）
   - kindle/niche-research.md（リサーチ＋企画3案）
   - kindle/templates/chapter-template.md, cover-workflow.md
   - coconala/listings.md（コード納品系の出品文3本）, proposal-templates.md, delivery-checklist.md
   - .claude/skills/content-factory/SKILL.md（`/content-factory` 週次運転スキル）

## 重要な設計決定

- **KDP は「AI-generated」として申告**（AI-assisted ではない。Claude が原稿の大半を執筆するため。未申告はアカウント停止リスク）
- **ココナラは文章系を出品しない**（AI生成記事は出品禁止コンテンツ例に該当。GAS/スクリプト/Web修正のコード納品系に限定）
- 表紙は Canva 手動作成を標準（AI画像を使うと表紙も申告対象になるため）
- 収益期待値は保守的に設定: 3ヶ月時点は「初売上が立てば成功」

## 次のアクション

- ユーザー: KDP アカウント作成、ココナラ登録、企画案の承認（推奨: 案A）
- 次回 `/content-factory` 起動時: Amazon 実測リサーチ（BSR・レビュー数）→ 1冊目タイトル確定 → 執筆開始
