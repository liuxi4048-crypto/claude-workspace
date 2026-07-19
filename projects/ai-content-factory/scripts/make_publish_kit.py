#!/usr/bin/env python3
"""make_publish_kit.py — book.yaml から KDP 入稿キット（publish-kit.md）を生成する。

使い方:
    python3 make_publish_kit.py <book_dir>

出力: <book_dir>/output/publish-kit.md
KDP の入稿フォームに上から順にコピペしていくだけで入稿が完了する構成。
所要目安: 15分/冊。
"""

import sys
from pathlib import Path

import yaml


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    book_dir = Path(sys.argv[1]).resolve()
    meta = yaml.safe_load((book_dir / "book.yaml").read_text(encoding="utf-8"))

    slug = meta.get("slug", book_dir.name)
    keywords = meta.get("keywords", [])
    categories = meta.get("categories", [])
    price = meta.get("price_jpy", 500)
    if not 250 <= price <= 1250:
        print(f"警告: 価格 {price}円 は 70% ロイヤリティ帯（250〜1,250円）の外です")
    if len(keywords) != 7:
        print(f"警告: キーワードが {len(keywords)} 個です（KDP は最大7個。7個埋めるのを推奨）")

    kw_rows = "\n".join(f"| キーワード{i+1} | `{k}` |" for i, k in enumerate(keywords))
    cat_rows = "\n".join(f"- {c}" for c in categories) or "- （book.yaml の categories に2つ設定してください）"

    kit = f"""# KDP 入稿キット: {meta['title']}

> このファイルの内容を **上から順に** KDP（kdp.amazon.co.jp）の「＋タイトルの新規作成 → 電子書籍」フォームへコピペしていく。所要目安 15分。

## 0. アップロードするファイル（生成済みか確認）

- 原稿: `output/{slug}.epub`
- 表紙: `output/cover.png`（2560×1600）

## 1. 電子書籍の詳細

| 項目 | 入力値 |
|------|--------|
| 言語 | 日本語 |
| 本のタイトル | {meta['title']} |
| タイトルのフリガナ | {meta.get('title_kana', '（book.yaml の title_kana に設定）')} |
| タイトルのローマ字 | {meta.get('title_romaji', '（book.yaml の title_romaji に設定）')} |
| サブタイトル | {meta.get('subtitle', '（なし）')} |
| 著者（姓/名） | {meta.get('author', '')} |
| 著者フリガナ・ローマ字 | {meta.get('author_kana', '')} / {meta.get('author_romaji', '')} |

### 内容紹介（コピペ用）

```
{meta.get('description', '（book.yaml の description に設定してください）').strip()}
```

### 出版に関して必要な権利
「私は著作権者であり、出版に関して必要な権利を保有しています。」を選択

### ⚠️ AI 生成コンテンツの申告（必須・最重要）

「AI 生成コンテンツ」の質問には **「はい」** を選び、以下の通り申告する:

| 質問 | 回答 |
|------|------|
| 文章 | **AI ツールで生成した（自分で大幅に編集した場合も含む）** |
| 画像 | **AI ツールで生成した**（表紙は make_cover.py によるプログラム生成のため） |
| 翻訳 | いいえ（該当する場合のみ） |

> この申告は Amazon 内部用で商品ページには表示されない。未申告は書籍削除・アカウント停止リスクがあるため必ず申告する。

### キーワード（7個）

{kw_rows}

### カテゴリー（2つまで）

{cat_rows}

## 2. 電子書籍のコンテンツ

1. 原稿のアップロード: `output/{slug}.epub` を選択
2. 表紙のアップロード: 「表紙をアップロード」→ `output/cover.png` を選択
3. プレビュー: オンラインプレビューアーで先頭〜2章を確認（レイアウト崩れがないか）
4. DRM: 「はい」を推奨

## 3. 電子書籍の価格設定

| 項目 | 入力値 |
|------|--------|
| KDP セレクトへの登録 | **登録する**（Kindle Unlimited の既読ページ収益を得るため） |
| 出版地域 | すべての地域 |
| ロイヤリティプラン | **70%** |
| 希望小売価格（円） | {price} 円 |

→ 内容を確認して「Kindle 本を出版」を押す。審査は通常72時間以内。

## 4. 出版後

- [ ] 出版完了メールを確認し、商品ページ URL を progress.md に記録
- [ ] 3日後・7日後に販売数と KENP（既読ページ数）を progress.md に記録
"""

    output = book_dir / "output"
    output.mkdir(exist_ok=True)
    kit_path = output / "publish-kit.md"
    kit_path.write_text(kit, encoding="utf-8")
    print(f"OK: {kit_path}")


if __name__ == "__main__":
    main()
