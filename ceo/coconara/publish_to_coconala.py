"""
Coconala 自動出品スクリプト
- ブラウザを開いてログインページへ遷移
- ユーザーが Google ログインを完了するまで待機
- ログイン後、サービス出品フォームを自動入力して出品
"""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

BASE = Path(__file__).parent

# ── 出品内容 ──────────────────────────────────────────────────
TITLE = "AIが激速作成！提案書・営業資料を最短3時間で納品します"

DESCRIPTION = """━━━━━━━━━━━━━━━━━━━━━━━━
🤖 AIが作る、プロ品質のビジネス資料
━━━━━━━━━━━━━━━━━━━━━━━━

「提案書を作る時間がない」
「資料の質を上げたいけどデザインが苦手」
「外注したいけど高すぎる」

そんな悩みを、最新AIエージェントが解決します。

━━━━━━━━━━━━━━━━━━━━━━━━
✅ こんな方におすすめ
━━━━━━━━━━━━━━━━━━━━━━━━

・新規営業の提案書を急いで作りたい
・投資家向けのピッチ資料が必要
・補助金申請書を書かなければならない
・会社紹介資料をリニューアルしたい
・業務提携の企画書を作成したい

━━━━━━━━━━━━━━━━━━━━━━━━
💼 対応できる資料の種類
━━━━━━━━━━━━━━━━━━━━━━━━

□ 新規営業提案書
□ 事業企画書・経営計画書
□ 投資家向けピッチ資料
□ 補助金・助成金申請書
□ 会社紹介・サービス紹介資料
□ 業務提携・協業提案書
□ コンセプトシート・企画書
□ その他ビジネス文書全般

━━━━━━━━━━━━━━━━━━━━━━━━
⚡ なぜAIエージェントが強いのか
━━━━━━━━━━━━━━━━━━━━━━━━

通常のフリーランスライターと異なり、
AIエージェントは「データを基に論理的に構成する」のが得意。

✔ 読み手が動くストーリー設計
✔ 数字・ROI・効果予測を自動算出
✔ 業界トレンドを踏まえた表現
✔ 修正指示への即時対応（数分以内）

━━━━━━━━━━━━━━━━━━━━━━━━
📦 納品物
━━━━━━━━━━━━━━━━━━━━━━━━

・Word形式（.docx）※編集可能
・PDF形式（印刷・送付用）
・スライド形式（プラン次第）

━━━━━━━━━━━━━━━━━━━━━━━━
⏰ 納期について
━━━━━━━━━━━━━━━━━━━━━━━━

ベーシック：最短3時間〜翌日
スタンダード：1〜2日
プレミアム：2〜3日（大型案件）

※依頼内容の情報をいただいた時点から納期カウント開始

━━━━━━━━━━━━━━━━━━━━━━━━
📊 実績・品質保証
━━━━━━━━━━━━━━━━━━━━━━━━

・使用AI：Anthropic Claude（世界最高水準）
・資料構成：ビジネスコンサルタント監修フレームワーク使用
・修正対応：各プランに明記した回数まで無料で対応"""

PURCHASE_NOTE = """ご購入後、以下の情報をトークルームでお知らせください：

1. 【資料の目的】何のための提案書か（営業・融資・補助金など）
2. 【提案先】相手の企業名・業種・規模（わかる範囲で）
3. 【提案内容】あなたのサービス・製品・事業の概要
4. 【強調したい点】他社との違い・強み・実績
5. 【NG事項】含めたくない内容があれば
6. 【参考資料】既存の会社紹介等があればご共有ください（任意）

情報が多いほど、刺さる資料になります。"""

IMAGES = [
    BASE / "images" / "thumbnail_main.png",
    BASE / "images" / "flow_diagram.png",
    BASE / "images" / "plan_comparison.png",
]

PLANS = [
    {"price": "3000",  "name": "ベーシック",    "days": "1",  "desc": "A4×3〜5ページの提案書 / Word+PDF / 修正1回 / 最短3時間"},
    {"price": "8000",  "name": "スタンダード",  "days": "2",  "desc": "A4×8〜12ページのフル提案書 / 図表付き / 修正3回 / 1〜2日"},
    {"price": "20000", "name": "プレミアム",    "days": "3",  "desc": "A4×20ページ以上 / PPT対応 / 修正無制限 / MTG30分付き"},
]

# ─────────────────────────────────────────────────────────────

async def wait_for_login(page):
    """ログイン完了（マイページ or サービス一覧が表示されるまで）を待つ"""
    print("\n👤 ブラウザでGoogleログインを完了してください...")
    print("   ログイン後、自動で次のステップに進みます。\n")
    # ログイン後に表示される要素が現れるまで最大5分待つ
    await page.wait_for_url("**/mypage/**", timeout=300_000)
    print("✅ ログイン確認")

async def fill_service_form(page):
    """出品フォームを入力"""
    print("📝 出品フォームを入力中...")

    # 出品ページへ遷移
    await page.goto("https://coconala.com/mypage/services/new", wait_until="networkidle")
    await page.wait_for_timeout(2000)

    # ── カテゴリ選択 ────────────────────────────────────────
    # ビジネス → 業務効率化・コンサルティング → 資料作成・プレゼン
    try:
        # カテゴリ選択ボタンをクリック
        await page.get_by_text("カテゴリを選択").first.click()
        await page.wait_for_timeout(1000)
        await page.get_by_text("ビジネス").first.click()
        await page.wait_for_timeout(800)
        await page.get_by_text("業務効率化・コンサルティング").first.click()
        await page.wait_for_timeout(800)
        await page.get_by_text("資料作成・プレゼン").first.click()
        await page.wait_for_timeout(800)
        print("  ✓ カテゴリ設定")
    except Exception as e:
        print(f"  ⚠ カテゴリ: 手動で設定してください ({e})")

    # ── タイトル ────────────────────────────────────────────
    try:
        title_field = page.get_by_placeholder("サービスタイトルを入力").first
        await title_field.fill(TITLE)
        print("  ✓ タイトル入力")
    except Exception:
        try:
            await page.locator("input[name='title'], input[placeholder*='タイトル']").first.fill(TITLE)
            print("  ✓ タイトル入力（代替セレクタ）")
        except Exception as e:
            print(f"  ⚠ タイトル: 手動で入力してください")

    # ── サービス説明 ────────────────────────────────────────
    try:
        desc_field = page.locator("textarea").first
        await desc_field.fill(DESCRIPTION)
        print("  ✓ 説明文入力")
    except Exception as e:
        print(f"  ⚠ 説明文: 手動で入力してください")

    # ── 画像アップロード ────────────────────────────────────
    try:
        file_input = page.locator("input[type='file']").first
        await file_input.set_input_files([str(p) for p in IMAGES if p.exists()])
        await page.wait_for_timeout(3000)
        print("  ✓ 画像アップロード")
    except Exception as e:
        print(f"  ⚠ 画像: 手動でアップロードしてください")

    print("\n⏸ フォームの残り項目（購入にあたって・料金プラン）を確認してください。")
    print("  準備ができたら Enter を押すと次へ進みます...")
    input()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=300)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        print("🚀 Coconala を開いています...")
        await page.goto("https://coconala.com/login", wait_until="domcontentloaded")

        await wait_for_login(page)
        await fill_service_form(page)

        print("\n✅ 自動入力完了！")
        print("   ブラウザで内容を確認し、「出品する」ボタンを押してください。")
        print("   ブラウザを閉じるまでこのスクリプトは待機します。\n")
        await page.wait_for_event("close", timeout=0)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
