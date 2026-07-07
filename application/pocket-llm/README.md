# 🤖 Pocket LLM — スマホで使えるAIアシスタント

スマホから使える、要約・計算・チャットができるAIアシスタントです。
**計算はクラウド(Google Gemini)で行う**ため、端末の性能に関係なくどのスマホでも軽快に動きます。

- **技術**: Vercel Edge Function(APIプロキシ)+ Google Gemini + Vite + vanilla JS
- **公開URL**: Vercel の本番URL(例 `https://claude-workspace-two-alpha.vercel.app`)
  - GitHub Pages 版から開いた場合も、API呼び出しは自動で Vercel バックエンドに向きます

## 🧭 設計の経緯

当初は端末内(オンデバイス)推論を目指し WebGPU(web-llm)→ CPU/WASM(Transformers.js)と
試しましたが、モバイルGPUの不具合(`!!!!`化け、`Buffer was unmapped`)や CPU の速度で
安定しませんでした。そこで **計算をスマホの外(クラウド)に逃がす構成**へ変更。
スマホは「入力を送って結果を表示する」だけの薄いクライアントになり、
**どの端末でも即座に・賢く・安定して動く**ようになりました。

```
スマホ(Web UI)
   │  POST /api/chat(文章)
   ▼
Vercel Edge Function（APIキーをサーバ側に保持）
   │  Gemini API（ストリーミング）
   ▼
Google Gemini → 逐次テキストをスマホへ返す
```

## 🔑 セットアップ(初回のみ・1回)

このアプリは Gemini の API キーが必要です(個人利用なら**無料枠**で十分)。

1. [Google AI Studio](https://aistudio.google.com/apikey) で **API キーを無料発行**
2. Vercel のプロジェクト → **Settings → Environment Variables** で以下を追加:
   - `GEMINI_API_KEY` = 発行したキー
   - (任意)`GEMINI_MODEL` = 使うモデル。未設定なら `gemini-2.0-flash`
3. **Redeploy**(再デプロイ)して反映

キーが未設定の場合、アプリ上部に案内が表示されます。

## 📱 使い方

1. スマホのブラウザで Vercel の本番URLを開く
2. すぐにチャット/要約/計算が使えます(モデルのダウンロードは不要)
3. ブラウザメニュー →「**ホーム画面に追加**」でアプリのように使えます

## ✨ 機能

| モード | 内容 |
|--------|------|
| 💬 チャット | ストリーミング応答、履歴の端末内保存 |
| 📝 要約 | 貼り付けたテキストを 短く / 段落 / 箇条書き で要約(最大6,000字) |
| 🧮 計算 | **数式は端末内の電卓エンジンが正確に計算**(AI不使用・オフラインでも動作)。文章題・単位換算はAIが解答 |

## ⚠️ 注意

- 入力テキストは **AI処理のためクラウド(Google)に送信されます**。機密情報の扱いにご注意ください。
- オフラインでは AI 機能は使えません(計算モードの数式計算のみ端末内で動作)。
- AIの回答には誤り(ハルシネーション)が含まれることがあります。重要な判断には使わないでください。

## 🛠 開発

```bash
cd application/pocket-llm
npm install
npm run dev        # 開発サーバー(APIは Vercel 本番か vercel dev が必要)
npm test           # 数式パーサー等のユニットテスト
npm run build      # 本番ビルド
node scripts/ui-check.mjs   # Chromium での UI スモークテスト(APIをモックして検証)
```

API(`/api/chat`, `/api/health`)は Vercel Edge Function です。ローカルで通しで試すには
`vercel dev` を使うか、デプロイ済みの本番URLで確認してください。

## デプロイ

- ルートの `vercel.json` が `application/pocket-llm` をビルドして配信し、`/api/*` を Edge Function として公開します。
- master への push で Vercel が自動デプロイします。
- `GEMINI_API_KEY` を Vercel の環境変数に設定するのを忘れないでください(未設定だと動きません)。
