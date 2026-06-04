# 並列実行ガイド

> Claude Code の **Agent tool** を使い、複数メンバーを同時並行で動かす仕組み。
> COOが並列召喚を判断し、結果を統合する。

---

## 並列実行の仕組み

```
通常（直列）                    並列実行
──────────                     ──────────
COO → CMO（完了待ち）           COO ┬→ CMO   ┐
COO → CFO（完了待ち）               ├→ CFO   ├ 同時実行
COO → CLO（完了待ち）               └→ CLO   ┘
                                        ↓
                                   COO が結果を統合
```

---

## 並列実行が有効な場面

| シナリオ | 並列対象 | 期待効果 |
|---|---|---|
| 案件評価 | CEO-Ext + CEO-Int | 外向き/内向き評価を同時に取得 |
| 提案作成 | CMO（文章）+ CFO（見積）| 提案文と見積を同時に作成 |
| AI設計ゲート | CAIO + CLO + CISO | 三者合議を同時スタート |
| スプリント末監査 | Internal Auditor + Internal Tech Auditor | 2種の監査を同時実施 |
| 技術設計レビュー | CPO（要件確認）+ CTO（実装設計）| 要件と設計を同時進行 |

---

## COO 並列召喚の手順

### Step 1: 並列判断
COO はタスクを受け取ったら以下を確認する。
```
□ 2つ以上のメンバーが独立して動けるか？
□ それぞれの成果物が相互依存していないか？
□ 最後に結果を統合できるか？
→ すべてYesなら並列実行を選択
```

### Step 2: 並列召喚の宣言
```
「[CMO] と [CFO] を並列召喚します。
 CMO: 提案文の作成
 CFO: 見積もりの計算
 完了後、COO が統合します。」
```

### Step 3: Agent tool で同時起動
1つのメッセージ内で複数の Agent tool call を送信する。
各Agentには対応するペルソナファイルの内容 + タスクを渡す。

### Step 4: 結果統合
全Agentの結果が返ってきたら COO が統合レポートを作成。

---

## メンバー別ペルソナファイルパス

| メンバー | ペルソナファイル |
|---|---|
| Chairman | `C:\Claude\team\chairman.md` |
| CEO-Ext | `C:\Claude\team\ceo_ext.md` |
| CEO-Int | `C:\Claude\team\ceo_int.md` |
| CFO | `C:\Claude\team\cfo.md` |
| CTO | `C:\Claude\team\cto.md` |
| CPO | `C:\Claude\team\cpo.md` |
| CMO | `C:\Claude\team\cmo.md` |
| CHRO | `C:\Claude\team\chro.md` |
| CISO | `C:\Claude\team\ciso.md` |
| CAIO | `C:\Claude\team\caio.md` |
| CLO | `C:\Claude\team\clo.md` |
| CXO | `C:\Claude\team\cxo.md` |
| Internal Auditor | `C:\Claude\team\internal_auditor.md` |
| Internal Tech Auditor | `C:\Claude\team\internal_tech_auditor.md` |
| External Auditor | `C:\Claude\team\external_auditor.md` |

---

## Agent prompt テンプレート

各Agentに渡すプロンプトの形式:

```
あなたは [役職名] です。
ペルソナ定義: [ペルソナファイルの内容]

## 今回のタスク
[具体的なタスク内容]

## 出力形式
[期待する出力形式]

## 制約
- このタスクのみに集中する
- 完了したら結果をCOOへ返す
```

---

## 並列実行の制約

| 制約 | 内容 |
|---|---|
| **Agentコスト** | 並列Agentは独立したClaudeセッション。トークンコストが増える |
| **最大並列数** | 一度に起動するAgentは 3〜5 以内を推奨 |
| **依存タスク不可** | A の結果が B に必要な場合は直列にする |
| **ファイル競合** | 同じファイルへの同時書き込みは避ける |
| **Chairman/COOは並列不可** | 統合役は常に直列（1つ）で動かす |
