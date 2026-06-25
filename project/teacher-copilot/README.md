# Teacher Co-Pilot

学習指導要領（2025年改訂版）準拠の問題・採点ルーブリックを自動生成する教師支援AIツール。

## 起動手順

```powershell
# 1. 依存パッケージをインストール
cd D:\claude-workspace\project\teacher-copilot
pip install -r requirements.txt

# 2. APIキーを設定
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# 3. アプリを起動
streamlit run app.py
```

ブラウザで `http://localhost:8501` が自動的に開きます。

## 使い方

1. サイドバーで **学年 → 教科 → 単元** を選択
2. 「📝 問題を生成する」ボタンをクリック
3. 5問 + 採点ルーブリックが自動生成される
4. Markdown または JSON でダウンロード

## 対応範囲

- **小学校**: 1〜6年 / 国語・算数・理科・社会・外国語・生活
- **中学校**: 1〜3年 / 国語・数学・理科・社会・英語
- **高校**: 1〜2年 / 現代の国語・数学I・II・物理・化学・生物・英語 等

## 技術スタック

- Python + Anthropic SDK (claude-sonnet-4-6)
- Streamlit
- 対応Issue: MOR-86
