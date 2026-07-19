# 制作パイプライン

原稿（Markdown）から KDP 入稿直前まで全自動。依存は PyYAML と Pillow（`pip install -r requirements.txt`）。
表紙のレンダリングはヘッドレス Chromium を直接使用（Playwright 不要）。

```bash
# 1冊分の成果物を全部作る（この順で実行）
python3 scripts/make_cover.py       kindle/books/book-01   # → output/cover.png + cover_thumb.png
python3 scripts/build_book.py       kindle/books/book-01   # → output/<slug>.epub（表紙同梱・構造検証つき）
python3 scripts/make_publish_kit.py kindle/books/book-01   # → output/publish-kit.md（KDPコピペ用）
```

残るユーザー作業は「publish-kit.md を KDP にコピペ＋2ファイルをアップロード」のみ（15分/冊）。

## 本の追加

`kindle/books/book-XX/` を作り、以下を置く:

- `book.yaml` — メタデータ（book-01 のものをコピーして編集）
- `cover.json` — 表紙の文言と配色
- `chapters/01-*.md, 02-*.md ...` — 章原稿（ファイル名順に結合される）

## 注意

- 表紙はプログラム生成のため **KDP で本文・画像とも「AI-generated」申告**（publish-kit.md に手順が入る）
- Chromium のパスが異なる環境では `make_cover.py <dir> --chromium /path/to/chromium`
- ローカル（Windows）で実行する場合は Chrome のパスを指定: `--chromium "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`
