# 🤖 Pocket LLM — スマホで動くローカルAI

スマホのブラウザ内で **ローカルLLM を完全プライベートに実行** する PWA です。
AIモデルはあなたの端末内だけで動き、入力テキストは一切外部に送信されません。

- **技術**: [Transformers.js](https://huggingface.co/docs/transformers.js/)(ONNX Runtime / WASM=CPU実行)+ Vite + vanilla JS
- **公開URL(2通り)**:
  - GitHub Pages: `https://liuxi4048-crypto.github.io/claude-workspace/pocket-llm/`
    （初回のみ Settings → Pages → Source を `gh-pages` ブランチ/`root` に設定して有効化が必要）
  - Vercel(本番): master への push で自動デプロイ。プロジェクトの本番URL直下で配信

## 🧭 設計方針

当初は WebGPU(@mlc-ai/web-llm)を使っていましたが、モバイルChromeの
WebGPUドライバとの相性で以下2つの症状が交互に発生し安定しませんでした:

- f16モデル → 出力に `!!!!` や `<pad>` トークンが混入(f16数値不安定)
- f32モデル → `Buffer was unmapped before mapping was resolved`
  ([web-llm Issue #497](https://github.com/mlc-ai/web-llm/issues/497), 未解決)

そこで**推論エンジンを WebGPU から CPU(WASM)に完全移行**しました。
速度は落ちますが、**「動く/動かない」のバラツキがなくなり、どの端末でも確実に応答が返る**設計です。

> **表示が古いままの場合**: GitHub Pages 側のデプロイが `Deployment failed, try again later.`
> で一時的に失敗し、1つ前のバージョンのまま配信され続けることがあります(シークレットタブでも
> 再現する場合はこれが原因)。`application/pocket-llm/` 配下に変更を加えて再度 push すると
> 再デプロイがトリガーされ、直ります。

## 📱 スマホでの使い方

1. Android/iOS のブラウザで公開URLを開く
2. モデルを選んで「モデルをロードする」をタップ
   - 初回はモデル(0.3〜1GB)をダウンロード。**Wi-Fi推奨**
   - 2回目以降は端末内キャッシュから読み込み、**オフラインでも動作**
3. ブラウザメニュー →「**ホーム画面に追加**」でアプリのように使えます

### 動作要件
- 主要ブラウザ(Chrome/Safari など。**WebGPU 不要**)
- WebAssembly + SharedArrayBuffer 対応(スマホの最近数年のブラウザなら概ねOK)
- RAM 3〜4GB あれば動作(モデルにより)
- 空きストレージ: モデルサイズ分(0.3〜1GB)

## ✨ 機能

| モード | 内容 |
|--------|------|
| 💬 チャット | ストリーミング応答、履歴の端末内保存 |
| 📝 要約 | 貼り付けたテキストを 短く / 段落 / 箇条書き で要約(最大6,000字) |
| 🧮 計算 | **数式は電卓エンジンが正確に計算**(LLM不使用)。文章題・単位換算はAIが途中式付きで解答 |

## 🧠 搭載モデル(設定で切替可能・すべて 4bit 量子化 ONNX)

CPU推論のため、モデルは軽量なものを中心に構成しています。

| モデル | DL目安 | 用途 |
|--------|--------|------|
| **SmolLM2 360M**(既定) | 約0.3GB | 最も軽く、CPUでも軽快。まずはこれで動作確認 |
| Qwen2.5 0.5B | 約0.4GB | 軽さと日本語対応のバランス |
| SmolLM2 1.7B | 約1GB | より賢い応答だが CPU では遅め |
| Qwen2.5 1.5B | 約1GB | 日本語に強い。応答はゆっくり |

> **速度について**: CPU推論のため、スマホでは1〜数トークン/秒 程度が現実的な速度です。
> 「速さ」より「必ず動く」ことを優先した設計です。長い応答は待ち時間が伸びます。

## ✅ ローカルLLMが得意なこと

- **要約**: 記事・メール・議事録の要約、箇条書き化
- **文章作成・リライト**: メール下書き、敬語への書き換え、校正
- **翻訳**: 日英・英日(日常文・ビジネス文レベル)
- **質問応答**: 言葉の意味、「〜とは何か」レベルの解説
- **アイデア出し**: 企画案の列挙、メリット/デメリット整理
- **テキスト整形**: 箇条書き⇔文章の変換、キーワード抽出、分類
- **簡単な推論・コード**: 文章題の立式、短いスクリプトの生成・説明

## ⚠️ 苦手なこと(と本アプリの対策)

| 苦手 | 対策 |
|------|------|
| 正確な計算(LLMは計算機ではない) | 計算モードの**電卓エンジン**が正確に計算 |
| 最新情報・時事(学習時点まで) | UIに明記 |
| 超長文の一括処理 | 要約モードに6,000字上限+分割案内 |
| 厳密な事実性(小型モデルは誤答あり) | 「重要な判断には使わない」旨を表示 |
| 画像・音声 | 対象外(テキスト専用) |

## 🔒 ローカル実行の利点

- **完全プライベート**: テキストは端末外に送信されない
- **オフライン動作**: 初回DL後は機内モードでもOK
- **無料・無制限**: API課金なし

## 🛠 開発

```bash
cd application/pocket-llm
npm install
npm run dev        # 開発サーバー
npm test           # 数式パーサーのユニットテスト
npm run build      # 本番ビルド(GitHub Pages 用 base 付き)
node scripts/ui-check.mjs   # Chromium での UI スモークテスト(要 dist-local ビルド)
```

ローカル検証用ビルド: `POCKET_LLM_BASE=/ npm run build -- --outDir dist-local`

## 🚀 デプロイ(GitHub Pages)

`.github/workflows/deploy-pocket-llm.yml` が master への push(`application/pocket-llm/**` 変更時)でビルドし、`gh-pages` ブランチへ公開します。
gh-pages ブランチが作成されると GitHub Pages が自動で有効化されるため、**手動設定は不要**です。master にマージするだけで自動公開されます。

## アーキテクチャ

```
ブラウザ(スマホ)
├── UI (vanilla JS)  … チャット/要約/計算タブ
├── mathparser.js    … 安全な数式評価器(eval不使用)→ 正確な計算
├── WebLLM engine    … WebGPU でモデル推論(すべて端末内)
│   └── モデル重み  … 初回DL後 Cache API に保存(オフライン対応)
└── Service Worker   … アプリシェルをキャッシュ(オフライン起動)
```
