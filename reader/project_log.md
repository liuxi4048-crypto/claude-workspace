# reader プロジェクトログ

## ai-digest — 2026-05-16

### 概要
Perplexity API で毎朝AIニュースを自動収集し、スマホで閲覧できるWebアプリ。

### 技術スタック
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL) — articles テーブル
- Vercel Cron — 毎朝7時JST (UTC 22:00) に自動収集
- PWA対応 — ホーム画面追加可能

### Linear / GitHub
- GitHub リポジトリ: https://github.com/liuxi4048-crypto/ai-digest
- Linear: 未登録（小規模のため省略）

### フェーズ進捗
- [x] Phase T0: 要件インテーク
- [x] Phase T1: 設計提案（案A採用）
- [x] Phase T2: 環境構築・コード実装・GitHub push
- [ ] Phase T3: Supabase・Vercel セットアップ（ユーザー作業）
- [ ] Phase T4: Perplexity APIキー挿入・本番稼働確認

### 技術的決定事項
- 2026-05-16: NextAuth は不使用。シンプルなCookie + パスワード認証を採用（個人ツールのため）
- 2026-05-16: Supabase クライアントは遅延初期化（Proxy パターン）でビルドエラー回避
- 2026-05-16: page.tsx に force-dynamic を付与してプリレンダリング時の Supabase 呼び出しを回避

### 引継ぎメモ
次のセッションでやること（ユーザー作業含む）:
1. Supabase でテーブル作成 → supabase/schema.sql を実行
2. .env.local.example を .env.local にコピーして値を入力
3. vercel deploy --prod でデプロイ
4. Vercel 環境変数に .env.local の値を設定
5. Perplexity APIキー取得後に PERPLEXITY_API_KEY を設定
6. /api/collect を手動で叩いて動作確認

---

## habit-tracker — 2026-05-16

### 概要
習慣トラッカー × AIコーチ。毎日の習慣をカレンダー形式でチェックし、週次でClaude Haikuがフィードバックを生成。

### 技術スタック
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL) — habits / habit_logs / ai_feedback テーブル
- Claude API (Haiku) — 週次コーチングメッセージ生成

### Linear / GitHub
- GitHub リポジトリ: https://github.com/liuxi4048-crypto/habit-tracker

### フェーズ進捗
- [x] Phase TP: checker選定（1位）
- [x] Phase T1: 設計確定
- [x] Phase T2: 実装・GitHub push
- [ ] Phase T3: Supabase・env設定（ユーザー作業）

### 引継ぎメモ
1. Supabase でテーブル作成 → supabase/schema.sql を実行
2. .env.local に SUPABASE_URL / SUPABASE_ANON_KEY / ANTHROPIC_API_KEY を設定
3. vercel deploy --prod

---

## note-flashcard — 2026-05-16

### 概要
学習ノートAI化ツール。テキスト/Markdownをアップロードするとフラッシュカード10枚を自動生成。学習モード・クイズモード付き。

### 技術スタック
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Claude API (Haiku) — フラッシュカード生成

### Linear / GitHub
- GitHub リポジトリ: https://github.com/liuxi4048-crypto/note-flashcard

### フェーズ進捗
- [x] Phase TP: checker選定（2位）
- [x] Phase T2: 実装・GitHub push
- [ ] Phase T3: .env.local に ANTHROPIC_API_KEY を設定

### 引継ぎメモ
1. .env.local に ANTHROPIC_API_KEY を設定
2. npm run dev で動作確認
3. vercel deploy --prod

---

## url-memo — 2026-05-16

### 概要
URLメモ管理。URLを保存するとClaude APIが自動でタイトル・要約を生成。タグ付き・全文検索対応。

### 技術スタック
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL) — bookmarks テーブル
- Claude API (Haiku) — URL要約・タイトル生成

### Linear / GitHub
- GitHub リポジトリ: https://github.com/liuxi4048-crypto/url-memo

### フェーズ進捗
- [x] Phase TP: checker選定（3位）
- [x] Phase T2: 実装・GitHub push
- [ ] Phase T3: Supabase・env設定（ユーザー作業）

### 引継ぎメモ
1. Supabase でテーブル作成 → supabase/schema.sql を実行
2. .env.local に SUPABASE_URL / SUPABASE_ANON_KEY / ANTHROPIC_API_KEY を設定
3. vercel deploy --prod

---

## claude-rag — 2026-05-17

### 概要
Claude RAG最適化システム。ドキュメントをpgvectorでインデックス化し、クエリに関連するコンテキストをClaudeに自動注入。プロンプトキャッシュ・モデル自動選択・コストダッシュボードを搭載。

### 技術スタック
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL + pgvector) — documents / chunks / chat_messages テーブル
- OpenAI text-embedding-3-small — embedding生成
- Claude API (Haiku/Sonnet/Opus 自動選択) + プロンプトキャッシュ

### 設計ポイント
- チャンクサイズ: 512 tokens / overlap: 64 tokens
- 抽象化レイヤー経由でembeddingモデル切替可能
- RAG失敗時はフォールバックでチャット継続
- checkerによる4層レビュー実施済み（設計2層 + 実装後2層）

### Linear / GitHub
- GitHub リポジトリ: https://github.com/liuxi4048-crypto/claude-rag

### フェーズ進捗
- [x] Phase TP: checker選定・4層設計レビュー
- [x] Phase T2: 実装・GitHub push・checker修正対応
- [ ] Phase T3: Supabase pgvector + OpenAI API + env設定（ユーザー作業）

### 引継ぎメモ
1. Supabase でテーブル作成 → `supabase/schema.sql` を実行
2. Supabase SQL Editor で `supabase/functions.sql` を実行（search_chunks RPCを登録）
3. .env.local に全5つの環境変数を設定
4. `npm run dev` で動作確認
5. vercel deploy --prod

---

## aiship — 2026-05-18

### 概要
Claude API × RAG 専門のAI受託開発事業「AiShip」。LP + 営業資料 + 契約書テンプレートを一式構築し、Vercelにデプロイ。事業立ち上げ〜初収益獲得までをreaderチームが管理。

### 事業詳細
- サービス名: AiShip（Claude API × RAG 専門 AI受託開発）
- 料金体系: ライト ¥200,000 / スタンダード ¥400,000 / プレミアム ¥800,000〜
- 支払い: 着手金30% → 中間30% → 納品40%

### 技術スタック（LP）
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Vercel デプロイ（GitHub連携・自動デプロイ）
- 問い合わせ: Webhook転送（個人情報非保持）

### Linear / GitHub
- GitHub リポジトリ: https://github.com/liuxi4048-crypto/aiship
- Linear プロジェクト: https://linear.app/moromizato/project/aiship-事業立ち上げ-bc145e63fc3f
- Linear イシュー: MOR-28〜MOR-33（Phase 1〜2 全タスク）

### フェーズ進捗
- [x] Phase TP: 事業案A/B/C検討 → C案採用 → checker 3ラウンドレビュー（89点/100）
- [x] Phase T2: LP実装・契約書テンプレート・営業資料作成・GitHub push
- [x] LP Vercel デプロイ: https://aiship-seven.vercel.app (MOR-28 Done)
- [ ] MOR-29: coconara 出品（ユーザー作業）
- [ ] MOR-30: SNS 告知ツイート（ユーザー作業）
- [ ] MOR-31: クラウドワークス毎日3件提案（Week 2-3）
- [ ] MOR-32: 商談クローズ → NDA締結 → 着手金受領（Week 4）
- [ ] MOR-33: Phase 2 SaaS MVP（受託案件安定後）

### 引継ぎメモ（ユーザー作業）
1. Vercel ダッシュボード → Settings → Environment Variables → `CONTACT_WEBHOOK_URL` を設定
   - Slack / Discord / Make の Webhook URL を入力することで問い合わせ通知が届く
2. coconara に sales/coconara_listing.md の内容で出品（MOR-29）
3. X（Twitter）に sales/sns_announcement.md のツイートを投稿（MOR-30）
4. Week 2-3 からクラウドワークス毎日3件提案（MOR-31）
