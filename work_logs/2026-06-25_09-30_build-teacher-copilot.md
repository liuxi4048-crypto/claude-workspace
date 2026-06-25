# 作業ログ — build: Teacher Co-Pilot MVP

**日時**: 2026-06-25 09:30 JST
**担当**: build スキル（coo-auto から起動）
**対象Issue**: MOR-86

---

## 実施フェーズ

### PHASE 1: インプット収集
- MOR-86 全文取得済み（coo-auto で先行取得）
- 完成条件を自己定義

### PHASE 2: 要件定義（CPO）
- ターゲット: 公立小中高の教師
- MVP機能: 問題5問生成 + ルーブリック + ダウンロード
- 技術スタック: Python + Anthropic SDK + Streamlit
- 保存先: `docs/requirements.md`

### PHASE 3: 設計（CTO）
- アーキテクチャ: Streamlit → Claude API（直接呼び出し）
- データ構造: JSON（questions配列）
- 保存先: `docs/design.md`

### PHASE 4: 実装
- `curriculum.py`: 小1〜高2の学習指導要領データ辞書（全教科・単元収録）
- `generator.py`: Claude claude-sonnet-4-6 呼び出し・JSON解析・Markdown変換
- `app.py`: Streamlit UI（選択 → 生成 → 表示 → ダウンロード）
- `requirements.txt` / `README.md`

### PHASE 5: 動作確認
- ブロッカー: Python 未インストール（Windows StoreスタブのみでStreamlit実行不可）
- 対処: コードを完成形で保存・ブロッカーとして記録

### PHASE 6: Linear更新
- MOR-86: 実装サマリーを description に追記

---

## 成果物

- `D:\claude-workspace\project\teacher-copilot\` 配下に5ファイル作成
- Linear MOR-86 を更新

## ブロッカー

- Python正式インストールが必要（`python.org` から Python 3.11+）
- `pip install -r requirements.txt` 後に `streamlit run app.py` で起動可能
