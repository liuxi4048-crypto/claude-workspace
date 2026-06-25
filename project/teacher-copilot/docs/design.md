# 技術設計 — Teacher Co-Pilot MVP

**作成**: 2026-06-25 / **担当**: CTO (build スキル)

---

## アーキテクチャ

```
[ブラウザ]
    │ HTTP
    ▼
[Streamlit (app.py)]
    ├── curriculum.py  ← 学習指導要領データ（静的辞書）
    └── generator.py   ← Anthropic API クライアント
            │ HTTPS
            ▼
    [Claude claude-sonnet-4-6 API]
```

## データ構造

### 入力
```python
{
  "grade": "小学5年",
  "subject": "算数",
  "unit": "分数の計算"
}
```

### Claude API出力（JSON）
```python
{
  "questions": [
    {
      "number": 1,
      "type": "計算",           # 記述 / 選択 / 計算 / 実験考察
      "question": "問題文...",
      "answer": "模範解答...",
      "rubric": {
        "知識・技能": "A: 正確に計算できる / B: 概ね正確 / C: 計算方法が不明確",
        "思考・判断・表現": "A: 手順を説明できる / B: 答えは出るが説明が弱い",
        "主体的に学習に取り組む態度": "（記述問題の場合のみ）"
      },
      "points": 20,
      "difficulty": "基礎"      # 基礎 / 標準 / 発展
    }
  ],
  "total_points": 100,
  "time_estimate": "45分",
  "learning_objectives": "分数の加減乗除を通じて数の感覚を育む"
}
```

## 実装ステップ（順序付き）

1. `curriculum.py` — 学習指導要領データ辞書（学年×教科×単元）
2. `generator.py` — Claude API呼び出し・JSON解析
3. `app.py` — Streamlit UI（選択 → 生成 → 表示 → ダウンロード）
4. `requirements.txt` — 依存パッケージ
5. `README.md` — 起動手順
6. 動作確認（Streamlit起動 → 問題生成テスト）

## システムプロンプト設計

```
あなたは日本の学習指導要領（2025年改訂版）に精通したベテラン教師です。
指定された学年・教科・単元に合わせて、観点別評価基準に準拠した問題と
採点ルーブリックを生成してください。

出力形式: JSON（questions配列を含む）
問題数: 必ず5問
難易度バランス: 基礎2問・標準2問・発展1問
合計点: 100点
観点: 知識・技能 / 思考・判断・表現 / 主体的に学習に取り組む態度
```

## エラーハンドリング方針

- APIキー未設定 → st.error で明示的にメッセージ表示してst.stop()
- JSON解析失敗 → 生のテキストをst.text_areaで表示（フォールバック）
- API呼び出し失敗 → st.error でエラー内容表示・リトライボタン提示
