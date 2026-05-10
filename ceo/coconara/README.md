# cocoanara AI提案書サービス

> AIが激速作成！提案書・営業資料を最短3時間で納品します

cocoanala出品サービスの納品エンジンと出品素材一式。

---

## ファイル構成

```
coconara-ai-proposal/
├── service_delivery.py       # 受注後の納品エンジン（Claude API + python-docx）
├── listing_content.md        # cocoanala出品テキスト（コピペ用）
├── make_images.py            # 出品画像生成スクリプト（Pillow）
├── make_sample_proposal.py   # サンプル提案書生成スクリプト
├── images/
│   ├── thumbnail_main.png    # メインサムネイル
│   ├── flow_diagram.png      # ご利用の流れ
│   └── plan_comparison.png   # 料金比較
├── samples/
│   └── sample_proposal_*.docx  # ポートフォリオ用サンプル
├── .env.example              # 環境変数テンプレート
└── .gitignore
```

---

## セットアップ

```bash
pip install anthropic python-docx pillow
cp .env.example .env
# .env に ANTHROPIC_API_KEY を記入
```

---

## 使い方（受注後の納品）

```bash
python service_delivery.py \
  --client "株式会社〇〇" \
  --service "提案するサービス名" \
  --audience "ターゲット読者" \
  --budget "予算感"
```

→ `samples/<クライアント名>_proposal.docx` が生成されます。

---

## 料金プラン

| プラン | 価格 | ページ数 | 修正 | 納期 |
|--------|------|---------|------|------|
| ベーシック | ¥3,000 | 3〜5ページ | 1回 | 最短3時間 |
| スタンダード | ¥8,000 | 8〜12ページ | 3回 | 1〜2日 |
| プレミアム | ¥20,000 | 20ページ以上 | 無制限 | 2〜3日 |

---

## Linear プロジェクト

タスク管理: [Moro / MOR — cocoanara AI提案書サービス](https://linear.app/moromizato/project/cocoanara-ai提案書サービス-a526b8f58aaa)
