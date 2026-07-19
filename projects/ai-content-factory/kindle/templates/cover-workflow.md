# 表紙作成ワークフロー

表紙は Kindle の売上を大きく左右する最重要パーツ。**標準はスクリプトによる全自動生成**（ユーザー作業ゼロ）。

## 標準: `make_cover.py` による自動生成

```bash
python3 scripts/make_cover.py kindle/books/book-XX
```

- 入力: `book-XX/cover.json`（タイトル行・サブタイトル・著者名・配色3色）
- 出力: `output/cover.png`（2560×1600・KDP仕様）と `output/cover_thumb.png`（160×100）
- タイトルの文字数から**フォントサイズを自動調整**（最長行が幅に収まる）

### ⚠️ 申告（必須）
この表紙はプログラム生成のため、**KDP 入稿時に「画像」も AI-generated として申告する**（本文と同じ画面。publish-kit.md に手順が自動で入る）。

### 品質チェック（Claude が毎回行う）
- [ ] `cover_thumb.png`（Amazon 検索結果サイズ）で**メインタイトルが読める**こと。読めなければ `cover.json` の `title_lines` を短く割り直すか配色コントラストを上げて再生成
- [ ] 競合の表紙群と並んだとき埋もれない配色か（Amazon で対象カテゴリを目視）

### cover.json の書式

```json
{
  "title_lines": ["小さなお店のための", "ChatGPT活用術"],
  "subtitle": "予約対応・メニュー・SNS投稿を1日30分で",
  "author": "ペンネーム",
  "bg_color": "#1a3a5c",
  "text_color": "#ffffff",
  "accent_color": "#f5c542"
}
```

配色の定石: 実用書は「濃色背景×白文字×アクセント1色」か「白背景×黒文字×アクセント1色」。
シリーズ本は配色を統一し、アクセント色だけ変えると棚で映える。

## 代替: Canva 手動作成（デザインの自由度を上げたいとき）

- Canva（無料版可）で 2560×1600 で作成。AI 画像生成機能を**使わなければ**表紙の申告は不要になる
- ストック素材は商用利用・電子書籍表紙への利用許諾を確認
- 完成 PNG を `book-XX/output/cover.png` に置けば、以降のパイプライン（EPUB 同梱）はそのまま動く
