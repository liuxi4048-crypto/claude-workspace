#!/usr/bin/env python3
"""make_cover.py — cover.json から Kindle 表紙 PNG（2560×1600）を自動生成する。

使い方:
    python3 make_cover.py <book_dir> [--chromium /path/to/chromium]

<book_dir>/cover.json の例:
{
  "title_lines": ["小さなお店のための", "ChatGPT活用術"],
  "subtitle": "予約対応・メニュー作り・SNS投稿を1日30分で回す",
  "author": "ペンネーム",
  "bg_color": "#1a3a5c",
  "text_color": "#ffffff",
  "accent_color": "#f5c542"
}

出力: <book_dir>/output/cover.png（2560×1600）と cover_thumb.png（160×100 視認性確認用）

重要: この表紙はプログラム生成のため、KDP 入稿時に本文と同様
「AI-generated」申告の対象（画像の項目）としてチェックすること。

依存: Pillow（サムネイル縮小用）。レンダリングはヘッドレス Chromium を直接叩く
（既定パス: /opt/pw-browsers/chromium。Chromium の極小スケールの transform は
タイルの一部しかラスタライズされないため、縮小は Pillow で行う）
"""

import html
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

DEFAULT_CHROMIUM = "/opt/pw-browsers/chromium"

PAGE = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ overflow: hidden; }}
  .cover {{ width: 2560px; height: 1600px; overflow: hidden;
         background: {bg}; color: {fg};
         font-family: "Noto Sans CJK JP", "Hiragino Sans", sans-serif;
         display: flex; flex-direction: column; justify-content: space-between;
         transform: scale({scale}); transform-origin: top left; }}
  .band {{ height: 56px; background: {accent}; }}
  .main {{ flex: 1; display: flex; flex-direction: column; justify-content: center;
           align-items: center; text-align: center; padding: 0 140px; }}
  .title {{ font-weight: 900; font-size: {title_size}px; line-height: 1.25;
            letter-spacing: 0.02em; }}
  .title .hl {{ color: {accent}; }}
  .subtitle {{ margin-top: 70px; font-size: 92px; font-weight: 700; line-height: 1.4;
               background: {accent}; color: {bg}; padding: 24px 48px; border-radius: 16px; }}
  .author {{ text-align: center; font-size: 76px; font-weight: 700;
             padding-bottom: 60px; opacity: 0.92; }}
</style></head>
<body>
  <div class="cover">
    <div class="band"></div>
    <div class="main">
      <div class="title">{title_html}</div>
      {subtitle_html}
    </div>
    <div class="author">{author}</div>
    <div class="band"></div>
  </div>
</body></html>
"""


def render(chromium: str, html_text: str, out_png: Path, width: int, height: int, scale: float = 1.0):
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as f:
        f.write(html_text)
        src = f.name
    cmd = [chromium, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
           f"--force-device-scale-factor={scale}", "--virtual-time-budget=8000",
           f"--window-size={width},{height}",
           f"--screenshot={out_png}", f"file://{src}"]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if not out_png.exists():
        sys.exit(f"エラー: Chromium レンダリング失敗\n{result.stderr[-800:]}")


def main():
    args = sys.argv[1:]
    chromium = DEFAULT_CHROMIUM
    if "--chromium" in args:
        i = args.index("--chromium")
        chromium = args[i + 1]
        del args[i:i + 2]
    if len(args) != 1:
        sys.exit(__doc__)
    if not shutil.which(chromium) and not Path(chromium).exists():
        sys.exit(f"エラー: Chromium が見つかりません: {chromium}（--chromium で指定可）")

    book_dir = Path(args[0]).resolve()
    spec = json.loads((book_dir / "cover.json").read_text(encoding="utf-8"))

    title_lines = spec.get("title_lines") or [spec.get("title", "タイトル未設定")]
    longest = max(len(l) for l in title_lines)
    # 最長行が横幅に収まるようフォントサイズを自動調整（2280px の可用幅 / 文字数）
    title_size = min(300, max(120, int(2280 / max(longest, 1))))
    title_html = "<br/>".join(html.escape(l) for l in title_lines)
    subtitle = spec.get("subtitle", "")
    subtitle_html = f'<div class="subtitle">{html.escape(subtitle)}</div>' if subtitle else ""

    def make_page(scale: float) -> str:
        return PAGE.format(
            bg=spec.get("bg_color", "#1a3a5c"), fg=spec.get("text_color", "#ffffff"),
            accent=spec.get("accent_color", "#f5c542"), title_size=title_size,
            title_html=title_html, subtitle_html=subtitle_html,
            author=html.escape(spec.get("author", "")), scale=scale,
        )

    output = book_dir / "output"
    output.mkdir(exist_ok=True)
    cover = output / "cover.png"
    render(chromium, make_page(1.0), cover, 2560, 1600)

    # サムネイル（Amazon 検索結果サイズ）: フルサイズ表紙を Pillow で縮小
    thumb = output / "cover_thumb.png"
    with Image.open(cover) as im:
        im.resize((160, 100), Image.LANCZOS).save(thumb)

    print(f"OK: {cover}（2560×1600）")
    print(f"OK: {thumb}（160×100 視認性確認用 — タイトルが読めるか目視すること）")
    print("申告リマインド: この表紙はプログラム生成のため KDP で AI-generated（画像）を申告する")


if __name__ == "__main__":
    main()
