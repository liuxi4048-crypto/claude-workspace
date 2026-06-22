# モロミーカンパニー（仮） チーム 組織図 & トリガー一覧

**バージョン**: v6.0 | **最終更新**: 2026-06-16

---

## 組織図

```
                ┌──────────────────────────────────┐
                │        ユーザー（オーナー）         │
                └────────┬──────────────┬───────────┘
                         │ 通常指揮      │ 独立監査
                         │               │
           ┌─────────────▼───┐    ┌──────▼──────────────┐
           │    Chairman      │    │  External Auditor   │
           │  最終審査・裁定   │    │  （技術審査も兼務）   │
           └──────────┬───────┘    └─────────────────────┘
                      │
         ┌────────────▼────────────┐
         │   CEO-Ext  ⟷  CEO-Int   │  対立議論モデル
         └────────────┬────────────┘
                      │ 合意後
         ┌────────────▼────────────┐
         │           COO            │  常駐・タスク管理・日報統合
         └──┬──┬──┬──┬──┬──┬──┬──┬──┬─┘
            │  │  │  │  │  │  │  │  │
          CFO CTO CPO CMO CHRO CISO CAIO CLO CXO
                 │                      │
                CRO ◀── フロー区切り    │
          （レビューゲート）              │
                    ┌───────────────────┴──────────┐
                    │  Internal Auditor             │ スプリント末
                    │  Internal Tech Auditor        │
                    └──────────────────────────────┘
```

---

## メンバー一覧（17名）

| # | 役職 | ファイル | 常駐 | 発動トリガー |
|---|---|---|---|---|
| L0 | **Chairman** | [chairman.md](chairman.md) | ✗ | `フェーズ完了` `CEO判断`（裁定）／自律発案ループからの自動召喚 |
| L1 | **CEO-Ext** | [ceo_ext.md](ceo_ext.md) | ✗ | `プロジェクト開始` `CEO判断` `提案審議`／自律発案ループからの自動召喚 |
| L1 | **CEO-Int** | [ceo_int.md](ceo_int.md) | ✗ | `プロジェクト開始` `CEO判断` `提案審議`／自律発案ループからの自動召喚 |
| L2 | **COO** | [coo.md](coo.md) | ✅ | `作業開始` `作業終了` `タスク確認`／**毎日09:00JSTにスケジュール自動起動** |
| L3 | **CFO** | [cfo.md](cfo.md) | ✗ | `見積作成` `予算確認` `KPI確認` |
| L3 | **CTO** | [cto.md](cto.md) | ✗ | `実装開始` `技術設計` |
| L3 | **CPO** | [cpo.md](cpo.md) | ✗ | `要件定義` `プロダクト設計` |
| L3 | **CMO** | [cmo.md](cmo.md) | ✗ | `営業開始` `提案作成` `顧客フォロー` |
| L3 | **CHRO** | [chro.md](chro.md) | ✗ | `人員配置` `採用` |
| L3 | **CISO** | [ciso.md](ciso.md) | ✗ | `セキュリティ確認` |
| L3 | **CAIO** | [caio.md](caio.md) | ✗ | `AI設計` `データ分析` `技術設計` |
| L3 | **CLO** | [clo.md](clo.md) | ✗ | `法務確認` |
| L3 | **CXO** | [cxo.md](cxo.md) | ✗ | `UX確認` `顧客対応` |
| L3 | **CRO** | [cro.md](cro.md) | ✗ | `レビュー` `フロー確認` `企画決定` `フェーズ完了` `成果物確認` |
| 監査 | **Internal Auditor** | [internal_auditor.md](internal_auditor.md) | ✗ | `内部監査` `フェーズ完了` `財務監査` |
| 監査 | **Internal Tech Auditor** | [internal_tech_auditor.md](internal_tech_auditor.md) | ✗ | `技術監査`（スプリント末） |
| 監査 | **External Auditor** | [external_auditor.md](external_auditor.md) | ✗ | `外部監査`（マイルストーン固定） |

---

## 召喚の4ルート

```
ルート①: ユーザーがトリガーワードを直接入力
    例）「営業開始」→ CMO召喚

ルート②: COOが必要と判断して召喚
    例）実装タスクが発生 → COOが「CTOを召喚します」と宣言

ルート③: メンバーが次のメンバーへバトンタッチ（宣言と同時に自動実行）
    例）CPOが要件定義完了 → 「CTOへバトンタッチ」と宣言した時点で
        COOが同一ターン内でCTOのAgentを起動する（人間の追加操作は不要）

ルート④: 自律発案ループによるスケジュール起動（NEW）
    例）毎日09:00JST → COOが自動起動 → CAIO+CMOが市場機会をスキャン
        → 提案があればCEO-Ext/Int対立議論まで自動連鎖
    詳細: auto_ideation.md
```

**人間の発語が必須なのはP0/P1のユーザー確認のみ。** ルート①〜④のいずれも、
召喚自体に人間の追加操作（ペインを開く・Agentを起動するボタンを押す等）を要求しない。

---

## 日報フロー

```
作業終了
    ↓
稼働した各部門が【部門日報】を提出
    ↓
COOが全部門日報を統合し【統合日報】を作成
    ↓
ユーザーへ提出
```

日報ファイル: `daily_reports/YYYY-MM-DD/`

---

## WezTerm キーバインド（並列実行）

| ショートカット | レイアウト |
|---|---|
| `CTRL+ALT+0` | COO（1ペイン） |
| `CTRL+ALT+1` | CEO対立議論（Ext左 + Int右） |
| `CTRL+ALT+2` | Chairman（1ペイン） |
| `CTRL+ALT+3` | AIガバナンス三者合議（CAIO+CLO+CISO） |
| `CTRL+ALT+4` | スプリント末監査（監査2名） |
| `CTRL+ALT+5` | 提案作成（CMO+CFO） |
| `CTRL+ALT+6` | CRO（1ペイン・ゲートレビュー） |

詳細: [`wezterm_guide.md`](wezterm_guide.md) | スクリプト: [`launch/`](launch/)

---

## 並列実行（対応シナリオ）

| シナリオ | 並列対象 | トリガー |
|---|---|---|
| 案件評価 | CEO-Ext + CEO-Int | `CEO判断` |
| 提案作成 | CMO + CFO | `提案作成` |
| AI設計ゲート | CAIO + CLO + CISO | `AI設計` |
| スプリント末監査 | Internal Auditor + Internal Tech Auditor | `内部監査` |

詳細: [`parallel_runner.md`](parallel_runner.md)

---

## 利用MCP一覧

| MCP | 用途 | 担当メンバー |
|---|---|---|
| **GitHub** | コード管理・PR・Issue | CTO |
| **Linear** | タスク管理・スプリント | COO / れん |
| **Chrome** | ブラウザ自動化（既存） | CMO |
| **Context7** | ライブラリ仕様の即時参照 | CAIO / CTO |
| **Playwright** | ブラウザ自動化（強化版） | CMO |
| **Computer Use** | デスクトップ操作 | COO |

---

## 運営管理ファイル

| ファイル | 用途 | 更新者 |
|---|---|---|
| [`project_master_plan.md`](project_master_plan.md) | **マスタープラン**（セキュリティ・KPI・フェーズ計画） | Chairman / COO |
| [`user_escalation_policy.md`](user_escalation_policy.md) | **ユーザー呼び出しポリシー**（P0〜P3・条件・禁止事項） | COO |
| [`decision_log.md`](decision_log.md) | CEO判断・Chairman裁定の記録 | Chairman |
| [`punch_list.md`](punch_list.md) | 監査指摘のトラッキング | Internal Auditor |
| [`retro_log.md`](retro_log.md) | スプリント振り返りの記録 | COO |
| [`parallel_runner.md`](parallel_runner.md) | 並列実行ガイド | COO |
| [`auto_ideation.md`](auto_ideation.md) | **自律発案ループ**（スケジュール起動・発案〜裁定の自動連鎖） | COO |
| [`daily_reports/`](daily_reports/) | 部門日報・統合日報（日付別） | 各部門 → COO |

---

## ワークスペース構成

各メンバーは専用ワークスペースで起動することでペルソナを自動ロードする。

```
C:\Claude\team\workspaces\
  [メンバー名]\
    CLAUDE.md   ← @../../[メンバー名].md を import → ペルソナ自動適用
```

| ディレクトリ | 対応メンバー |
|---|---|
| `workspaces/coo/` | COO |
| `workspaces/cto/` | CTO |
| `workspaces/cpo/` | CPO |
| `workspaces/cfo/` | CFO |
| `workspaces/cmo/` | CMO |
| `workspaces/chro/` | CHRO |
| `workspaces/ciso/` | CISO |
| `workspaces/caio/` | CAIO |
| `workspaces/clo/` | CLO |
| `workspaces/cxo/` | CXO |
| `workspaces/chairman/` | Chairman |
| `workspaces/ceo_ext/` | CEO-Ext |
| `workspaces/ceo_int/` | CEO-Int |
| `workspaces/internal_auditor/` | Internal Auditor |
| `workspaces/internal_tech_auditor/` | Internal Tech Auditor |
| `workspaces/external_auditor/` | External Auditor |
