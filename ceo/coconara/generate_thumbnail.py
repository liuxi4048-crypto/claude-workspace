"""LP・セールスコピー サービスサムネイル生成スクリプト"""
from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_PATH = r"C:\Claude\ceo\coconara\lp_service_thumbnail.png"

W, H = 1080, 810

img = Image.new("RGB", (W, H), color=(30, 42, 120))
draw = ImageDraw.Draw(img)

# グラデーション風の背景を作る（上部→下部で色変化）
for y in range(H):
    ratio = y / H
    r = int(30 + ratio * 10)
    g = int(42 + ratio * 20)
    b = int(120 + ratio * 40)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# アクセントバー（左）
draw.rectangle([0, 0, 8, H], fill=(99, 179, 237))

# 上部ラベル
draw.rectangle([60, 50, 320, 105], fill=(99, 179, 237))

# フォント（日本語対応。なければデフォルト）
FONT_PATH_BOLD = r"C:\Windows\Fonts\YuGothB.ttc"
FONT_PATH_REG  = r"C:\Windows\Fonts\YuGothR.ttc"

def load_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

font_label  = load_font(FONT_PATH_BOLD, 28)
font_title  = load_font(FONT_PATH_BOLD, 60)
font_sub    = load_font(FONT_PATH_BOLD, 36)
font_body   = load_font(FONT_PATH_REG,  34)
font_price  = load_font(FONT_PATH_BOLD, 52)
font_badge  = load_font(FONT_PATH_BOLD, 26)

# ラベル
draw.text((70, 58), "AI × 専門家レビュー", font=font_label, fill=(10, 30, 80))

# メインタイトル
draw.text((60, 130), "LP・セールスコピー", font=font_title, fill=(255, 255, 255))
draw.text((60, 210), "最短3時間で納品！", font=font_sub, fill=(99, 179, 237))

# 区切り線
draw.line([(60, 270), (W - 60, 270)], fill=(80, 100, 180), width=2)

# チェックリスト
items = [
    "✓  キャッチコピー 5案",
    "✓  ファーストビュー文章",
    "✓  ボディコピー全文",
    "       （課題提起→解決策→実績→CTA）",
    "✓  FAQ（よくある質問）5問付き",
]
y_start = 295
for item in items:
    color = (180, 230, 180) if item.startswith("✓") else (160, 160, 200)
    draw.text((80, y_start), item, font=font_body, fill=color)
    y_start += 52

# 区切り線
draw.line([(60, y_start + 10), (W - 60, y_start + 10)], fill=(80, 100, 180), width=2)

# 価格
draw.text((80, y_start + 30), "¥ 5,000 〜", font=font_price, fill=(255, 215, 0))
draw.text((330, y_start + 48), "（テキストデータ納品）", font=font_badge, fill=(160, 200, 255))

# 右下バッジ
badge_x, badge_y = W - 260, H - 120
draw.ellipse([badge_x, badge_y, badge_x + 220, badge_y + 90], fill=(255, 180, 0))
draw.text((badge_x + 22, badge_y + 22), "最短 3時間", font=load_font(FONT_PATH_BOLD, 34), fill=(30, 30, 80))

img.save(OUTPUT_PATH, "PNG")
print(f"サムネイル生成完了: {OUTPUT_PATH}")
