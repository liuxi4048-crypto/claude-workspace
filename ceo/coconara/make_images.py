"""
Coconara出品用 画像生成スクリプト
thumbnail_main.png / flow_diagram.png / plan_comparison.png を生成する
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), "images")
os.makedirs(OUT, exist_ok=True)

# ── 共通設定 ──────────────────────────────────────────────────
NAVY   = (26, 58, 110)      # #1A3A6E
AQUA   = (0, 180, 216)      # #00B4D8
GOLD   = (212, 175, 55)     # #D4AF37
WHITE  = (255, 255, 255)
LGRAY  = (245, 247, 250)    # #F5F7FA
MGRAY  = (200, 210, 220)
DGRAY  = (80, 90, 110)
BLACK  = (20, 20, 30)

def load_font(size, bold=False):
    """Windows 標準フォントを優先して読み込む"""
    candidates = [
        "C:/Windows/Fonts/YuGothB.ttc",   # Yu Gothic Bold
        "C:/Windows/Fonts/YuGothM.ttc",   # Yu Gothic Medium
        "C:/Windows/Fonts/meiryo.ttc",    # Meiryo
        "C:/Windows/Fonts/msgothic.ttc",  # MS Gothic
        "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

def draw_rounded_rect(draw, xy, radius, fill, outline=None, width=2):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill,
                           outline=outline, width=width)

def center_text(draw, text, font, y, width, color=WHITE):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (width - tw) // 2
    draw.text((x, y), text, font=font, fill=color)

# ── 1. メインサムネイル (1200×900) ───────────────────────────
def make_thumbnail():
    W, H = 1200, 900
    img = Image.new("RGB", (W, H), NAVY)
    draw = ImageDraw.Draw(img)

    # グラデーション風: 上半分をやや明るく
    for y in range(H // 2):
        ratio = y / (H // 2)
        r = int(26 + 20 * (1 - ratio))
        g = int(58 + 20 * (1 - ratio))
        b = int(110 + 30 * (1 - ratio))
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # 装飾: 右上に薄い円
    draw.ellipse([820, -80, 1280, 380], outline=(60, 100, 180), width=3)
    draw.ellipse([880, -20, 1220, 320], outline=(50, 90, 160), width=2)

    # 左下装飾ライン
    for i in range(5):
        draw.line([(0, 700 + i*25), (300, 700 + i*25)], fill=AQUA, width=2)

    # AIバッジ（左上）
    draw_rounded_rect(draw, [50, 50, 280, 100], radius=20, fill=AQUA)
    f_badge = load_font(22, bold=True)
    draw.text((70, 62), "AI エージェント搭載", font=f_badge, fill=WHITE)

    # メインタイトル
    f_main = load_font(70, bold=True)
    f_sub  = load_font(36)
    f_cap  = load_font(26)

    center_text(draw, "AIが激速作成！", f_main, 180, W)
    center_text(draw, "提案書・営業資料を", f_sub, 290, W)
    center_text(draw, "最短３時間で納品します", f_sub, 345, W)

    # 区切り線
    draw.line([(350, 420), (850, 420)], fill=AQUA, width=3)

    # 特徴3点
    features = ["24時間以内納品", "Word + PDF 形式", "修正対応あり"]
    fx_start = 160
    f_feat = load_font(24)
    for i, feat in enumerate(features):
        x = fx_start + i * 300
        draw_rounded_rect(draw, [x, 450, x+250, 510], radius=14, fill=(40, 80, 150))
        bbox = draw.textbbox((0,0), feat, font=f_feat)
        tw = bbox[2]-bbox[0]
        draw.text((x + (250-tw)//2, 462), feat, font=f_feat, fill=WHITE)

    # 価格
    f_price_label = load_font(28)
    f_price = load_font(60, bold=True)
    center_text(draw, "ベーシック", f_price_label, 580, W, MGRAY)
    center_text(draw, "¥3,000〜", f_price, 625, W, GOLD)

    # 下部帯
    draw.rectangle([0, 820, W, H], fill=(15, 35, 75))
    f_bot = load_font(22)
    center_text(draw, "Anthropic Claude 最新モデル使用  |  ビジネスコンサルタント監修フレームワーク", f_bot, 850, W, MGRAY)

    img.save(os.path.join(OUT, "thumbnail_main.png"))
    print("✅ thumbnail_main.png")

# ── 2. ご利用の流れ (1200×600) ──────────────────────────────
def make_flow():
    W, H = 1200, 600
    img = Image.new("RGB", (W, H), LGRAY)
    draw = ImageDraw.Draw(img)

    # タイトル
    f_title = load_font(42, bold=True)
    f_step  = load_font(20, bold=True)
    f_desc  = load_font(19)
    f_num   = load_font(32, bold=True)

    center_text(draw, "ご利用の流れ", f_title, 40, W, NAVY)
    draw.line([(500, 105), (700, 105)], fill=AQUA, width=3)

    steps = [
        ("01", "ご購入", "ご購入後\nトークルームへ"),
        ("02", "情報共有", "5項目を\nお知らせください"),
        ("03", "AI生成", "最短3時間で\n資料を生成"),
        ("04", "納品", "Word+PDF\nで受け渡し"),
    ]

    box_w, box_h = 220, 200
    gap = 40
    total = len(steps) * box_w + (len(steps) - 1) * gap
    start_x = (W - total) // 2
    box_y = 160

    for i, (num, title, desc) in enumerate(steps):
        x = start_x + i * (box_w + gap)

        # カード
        draw_rounded_rect(draw, [x, box_y, x+box_w, box_y+box_h],
                          radius=18, fill=NAVY)

        # 番号バッジ
        draw_rounded_rect(draw, [x+10, box_y+10, x+60, box_y+50],
                          radius=10, fill=AQUA)
        draw.text((x+18, box_y+14), num, font=f_num, fill=WHITE)

        # タイトル
        bbox = draw.textbbox((0,0), title, font=f_step)
        tw = bbox[2]-bbox[0]
        draw.text((x + (box_w-tw)//2, box_y+70), title, font=f_step, fill=WHITE)

        # 説明
        lines = desc.split("\n")
        for j, line in enumerate(lines):
            bbox2 = draw.textbbox((0,0), line, font=f_desc)
            tw2 = bbox2[2]-bbox2[0]
            draw.text((x + (box_w-tw2)//2, box_y+115+j*28), line, font=f_desc, fill=MGRAY)

        # 矢印（最後以外）
        if i < len(steps) - 1:
            ax = x + box_w + 5
            ay = box_y + box_h // 2
            draw.line([(ax, ay), (ax+gap-8, ay)], fill=AQUA, width=4)
            draw.polygon([(ax+gap-8, ay-10), (ax+gap-8, ay+10), (ax+gap+2, ay)], fill=AQUA)

    # 下部メモ
    f_note = load_font(20)
    center_text(draw, "※ 情報をご共有いただいた時点から納期カウント開始", f_note, 420, W, DGRAY)

    img.save(os.path.join(OUT, "flow_diagram.png"))
    print("✅ flow_diagram.png")

# ── 3. 料金プラン比較 (1200×700) ─────────────────────────────
def make_plans():
    W, H = 1200, 700
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)

    f_title  = load_font(42, bold=True)
    f_plan   = load_font(28, bold=True)
    f_price  = load_font(50, bold=True)
    f_feat   = load_font(20)
    f_badge  = load_font(18, bold=True)
    f_yen    = load_font(22)

    center_text(draw, "料金プラン", f_title, 30, W, NAVY)
    draw.line([(520, 95), (680, 95)], fill=AQUA, width=3)

    plans = [
        {
            "name": "ベーシック",
            "price": "¥3,000",
            "features": ["A4×3〜5ページ", "Word + PDF 納品", "修正1回まで", "最短3時間〜"],
            "bg": LGRAY, "fg": NAVY, "price_color": NAVY, "badge": None,
        },
        {
            "name": "スタンダード",
            "price": "¥8,000",
            "features": ["A4×8〜12ページ", "図表・表付き", "修正3回まで", "1〜2日納品"],
            "bg": NAVY, "fg": WHITE, "price_color": GOLD, "badge": "人気 No.1",
        },
        {
            "name": "プレミアム",
            "price": "¥20,000",
            "features": ["A4×20ページ以上", "PPT形式にも対応", "修正 無制限", "MTG 30分付き"],
            "bg": LGRAY, "fg": NAVY, "price_color": NAVY, "badge": None,
        },
    ]

    card_w, card_h = 310, 470
    gap = 50
    total = len(plans) * card_w + (len(plans)-1) * gap
    sx = (W - total) // 2
    cy = 130

    for i, p in enumerate(plans):
        x = sx + i * (card_w + gap)
        bg = p["bg"]
        fg = p["fg"]

        # カード影（ずらして描画）
        draw_rounded_rect(draw, [x+4, cy+4, x+card_w+4, cy+card_h+4],
                          radius=20, fill=(180,190,200))
        # カード本体
        draw_rounded_rect(draw, [x, cy, x+card_w, cy+card_h],
                          radius=20, fill=bg)

        # バッジ
        if p["badge"]:
            bw = 130
            bx = x + (card_w - bw) // 2
            draw_rounded_rect(draw, [bx, cy-18, bx+bw, cy+22], radius=12, fill=GOLD)
            bbox = draw.textbbox((0,0), p["badge"], font=f_badge)
            tw = bbox[2]-bbox[0]
            draw.text((bx+(bw-tw)//2, cy-10), p["badge"], font=f_badge, fill=NAVY)

        # プラン名
        bbox = draw.textbbox((0,0), p["name"], font=f_plan)
        tw = bbox[2]-bbox[0]
        draw.text((x+(card_w-tw)//2, cy+30), p["name"], font=f_plan, fill=fg)

        # 区切り
        draw.line([(x+30, cy+82), (x+card_w-30, cy+82)],
                  fill=AQUA if bg==NAVY else MGRAY, width=2)

        # 価格
        bbox = draw.textbbox((0,0), p["price"], font=f_price)
        tw = bbox[2]-bbox[0]
        draw.text((x+(card_w-tw)//2, cy+100), p["price"], font=f_price, fill=p["price_color"])

        # 税込み
        t = "（税込）"
        bbox = draw.textbbox((0,0), t, font=f_yen)
        tw = bbox[2]-bbox[0]
        draw.text((x+(card_w-tw)//2, cy+165), t, font=f_yen,
                  fill=(160,170,180) if bg==NAVY else DGRAY)

        # 機能一覧
        for j, feat in enumerate(p["features"]):
            fy = cy + 210 + j * 48
            # チェックマーク
            cx2 = x + 35
            draw.ellipse([cx2, fy+2, cx2+20, fy+22], fill=AQUA)
            draw.text((cx2+4, fy+2), "✓", font=f_feat, fill=WHITE)
            draw.text((cx2+28, fy+2), feat, font=f_feat, fill=fg)

    img.save(os.path.join(OUT, "plan_comparison.png"))
    print("✅ plan_comparison.png")

if __name__ == "__main__":
    make_thumbnail()
    make_flow()
    make_plans()
    print("\n🎉 全画像生成完了 →", OUT)
