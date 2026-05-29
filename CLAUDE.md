# Claude Code — モデル使い分け規約

このプロジェクト（モロミーカンパニー）では、場面に応じて以下のモデルを使い分けてください。
モデルは `/model` コマンドで切り替えます。

---

## モデル選択マトリクス

| 場面 | モデル | 理由 |
|------|--------|------|
| CEO判断・戦略議論・提案審議 | **Opus** | 複雑な意思決定・対立議論モデルに最高品質が必要 |
| Chairman 裁定・フェーズ完了審査 | **Opus** | 最終判断・監査は精度優先 |
| External Auditor による外部監査 | **Opus** | 客観性と深い分析が求められる |
| 実装・技術設計（CTO/CAIO） | **Sonnet** | コード生成・設計は品質とコストのバランスが最適 |
| 要件定義・プロダクト設計（CPO） | **Sonnet** | 中程度の複雑さ、繰り返し発生するタスク |
| AIDesk の AI生成機能開発 | **Sonnet** | Claude API 呼び出しコードの実装 |
| 日報作成・タスク確認（COO常駐業務） | **Haiku** | 定型・高頻度タスクはコスト最小化 |
| 法務確認・セキュリティ確認の定型チェック | **Haiku** | チェックリスト確認など低複雑度タスク |
| ドキュメント検索・情報収集のみ | **Haiku** | Read-only の調査タスク |

---

## 切り替えタイミングの目安

```
タスク開始時に判断する:

複雑な判断 / 戦略 / 監査
  → Opus  (/model claude-opus-4-8)

コード実装 / 設計 / 中程度の分析
  → Sonnet  (/model claude-sonnet-4-6)  ← デフォルト

定型作業 / 確認 / 検索 / 日報
  → Haiku  (/model claude-haiku-4-5-20251001)
```

---

## チームメンバー別の推奨モデル

| メンバー | 推奨モデル |
|---------|-----------|
| Chairman | Opus |
| CEO-Ext / CEO-Int | Opus |
| External Auditor | Opus |
| COO（常駐） | Haiku（定型） / Sonnet（複雑判断） |
| CTO | Sonnet |
| CPO | Sonnet |
| CFO | Sonnet（見積・KPI分析） |
| CMO | Sonnet（提案書作成） / Haiku（定型フォロー） |
| CHRO | Haiku（定型） / Sonnet（採用戦略） |
| CISO | Sonnet |
| CAIO | Opus（AI戦略） / Sonnet（実装） |
| CLO | Sonnet |
| CXO | Sonnet |
| Internal Auditor | Sonnet |
| Internal Tech Auditor | Sonnet |

---

## AIDesk 開発時の注意

`aidesk/` 配下の開発は基本 **Sonnet**。
ただし以下は **Opus** を使用:
- アーキテクチャ全体の見直し
- セキュリティ設計の判断
- パフォーマンス問題の根本原因分析

---

## Fast Mode

`/fast` で Opus の高速出力モードを有効化できます。
CEO判断など Opus が必要だが応答速度も重視する場合に使用してください。
