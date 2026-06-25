"""
Claude API を使った問題・採点ルーブリック生成モジュール
"""
import json
import re
import anthropic

SYSTEM_PROMPT = """あなたは日本の学習指導要領（2025年改訂版）に精通した、経験豊富なベテラン教師です。
指定された学年・教科・単元に合わせて、観点別評価基準に準拠した問題と採点ルーブリックを生成してください。

## 出力形式（必ずJSON形式で出力すること）

```json
{
  "questions": [
    {
      "number": 1,
      "type": "記述",
      "question": "問題文をここに記述",
      "answer": "模範解答をここに記述",
      "rubric": {
        "知識・技能": "A: ～ / B: ～ / C: ～",
        "思考・判断・表現": "A: ～ / B: ～ / C: ～",
        "主体的に学習に取り組む態度": "記述問題・探究問題の場合のみ記述、それ以外は空文字"
      },
      "points": 20,
      "difficulty": "基礎"
    }
  ],
  "total_points": 100,
  "time_estimate": "45分",
  "learning_objectives": "この問題セットで測定する学習目標を1〜2文で記述"
}
```

## 生成ルール

- **問題数**: 必ず5問生成する
- **難易度バランス**: 基礎2問・標準2問・発展1問
- **合計点**: 100点（配点は問題の難易度・思考量に応じて調整）
- **問題タイプ**: 記述 / 選択 / 計算 / 実験考察 / 読解 の中から単元に適切なものを選ぶ
- **学習指導要領準拠**: 単元の内容・目標に忠実に従い、学習の到達目標を適切に測定する
- **採点ルーブリック**: 教師が迷わず採点できるよう、A（十分満足）/B（おおむね満足）/C（努力を要する）の基準を具体的に記述する
- **「主体的に学習に取り組む態度」**: 記述・探究・実験考察問題のみ記述。計算・選択問題は空文字にする
- **出力**: JSONのみを返す。説明文・前置きは一切不要
"""


def generate_questions(grade: str, subject: str, unit: str, client: anthropic.Anthropic) -> dict:
    """
    指定した学年・教科・単元の問題を生成して辞書で返す。
    JSON解析に失敗した場合は ValueError を送出する。
    """
    prompt = f"""以下の条件で問題と採点ルーブリックを生成してください。

学年: {grade}
教科: {subject}
単元: {unit}

学習指導要領（2025年改訂版）に準拠した問題を5問作成し、JSONのみを返してください。"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text

    # コードブロック内のJSONを優先して抽出
    code_block = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if code_block:
        json_str = code_block.group(1)
    else:
        # コードブロックがなければ { } の範囲を抽出
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start == -1 or end <= start:
            raise ValueError(f"JSONが見つかりませんでした。生の応答:\n{raw[:500]}")
        json_str = raw[start:end]

    return json.loads(json_str)


def result_to_markdown(result: dict, grade: str, subject: str, unit: str) -> str:
    """生成結果を Markdown 文字列に変換する。"""
    lines = [
        f"# {grade} {subject} — {unit}",
        f"",
        f"**合計点**: {result.get('total_points', 100)}点　｜　**予想解答時間**: {result.get('time_estimate', '—')}",
        f"",
        f"**学習目標**: {result.get('learning_objectives', '')}",
        f"",
        "---",
        "",
    ]

    difficulty_label = {"基礎": "★☆☆", "標準": "★★☆", "発展": "★★★"}

    for q in result.get("questions", []):
        diff = q.get("difficulty", "標準")
        lines += [
            f"## 問{q['number']}　[{q.get('type', '')}]　{difficulty_label.get(diff, diff)}　{q.get('points', 0)}点",
            f"",
            f"{q['question']}",
            f"",
            f"**模範解答**",
            f"",
            f"> {q.get('answer', '')}",
            f"",
            f"**採点ルーブリック**",
            f"",
        ]
        for key, val in q.get("rubric", {}).items():
            if val:
                lines.append(f"- **{key}**: {val}")
        lines += ["", "---", ""]

    return "\n".join(lines)
