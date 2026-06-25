"""
Teacher Co-Pilot — 教師支援AI
学習指導要領（2025年改訂版）準拠の問題・採点ルーブリック自動生成
"""
import json
import os

import anthropic
import streamlit as st

from curriculum import GRADES, get_subjects, get_units
from generator import generate_questions, result_to_markdown

# ─── ページ設定 ───────────────────────────────────────────────
st.set_page_config(
    page_title="Teacher Co-Pilot",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("📚 Teacher Co-Pilot")
st.caption("学習指導要領（2025年改訂版）準拠 ｜ 問題・採点ルーブリック自動生成")

# ─── APIキー確認 ──────────────────────────────────────────────
api_key = os.environ.get("ANTHROPIC_API_KEY", "")
if not api_key:
    st.error("⚠️ `ANTHROPIC_API_KEY` が設定されていません。")
    st.code("# Windows PowerShell\n$env:ANTHROPIC_API_KEY = 'sk-ant-...'", language="powershell")
    st.code("# macOS / Linux\nexport ANTHROPIC_API_KEY='sk-ant-...'", language="bash")
    st.stop()

client = anthropic.Anthropic(api_key=api_key)

# ─── サイドバー ───────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ 問題設定")

    grade = st.selectbox("学年", GRADES, index=4)  # デフォルト: 小学5年
    subjects = get_subjects(grade)
    subject = st.selectbox("教科", subjects)
    units = get_units(grade, subject)
    unit = st.selectbox("単元", units)

    st.divider()
    st.caption("難易度バランス: 基礎2問・標準2問・発展1問（自動）")
    st.caption("合計: 100点")

    generate_btn = st.button("📝 問題を生成する", type="primary", use_container_width=True)

    st.divider()
    st.caption("Powered by Claude claude-sonnet-4-6")
    st.caption("MOR-86 — Teacher Co-Pilot MVP")

# ─── 問題生成 ─────────────────────────────────────────────────
if generate_btn:
    with st.spinner(f"「{grade} {subject} — {unit}」の問題を生成中..."):
        try:
            result = generate_questions(grade, subject, unit, client)
            st.session_state["result"] = result
            st.session_state["meta"] = {"grade": grade, "subject": subject, "unit": unit}
            st.success("生成完了！")
        except json.JSONDecodeError as e:
            st.error(f"JSONの解析に失敗しました: {e}")
        except Exception as e:
            st.error(f"エラーが発生しました: {e}")

# ─── 結果表示 ─────────────────────────────────────────────────
if "result" in st.session_state:
    result = st.session_state["result"]
    meta = st.session_state["meta"]
    grade_d, subject_d, unit_d = meta["grade"], meta["subject"], meta["unit"]

    # ヘッダー指標
    col1, col2, col3 = st.columns(3)
    col1.metric("問題数", f"{len(result.get('questions', []))} 問")
    col2.metric("合計点", f"{result.get('total_points', 100)} 点")
    col3.metric("予想解答時間", result.get("time_estimate", "—"))

    st.info(f"**学習目標**: {result.get('learning_objectives', '')}")
    st.divider()

    # 問題一覧
    difficulty_icon = {"基礎": "🟢", "標準": "🟡", "発展": "🔴"}
    questions = result.get("questions", [])

    for q in questions:
        diff = q.get("difficulty", "標準")
        icon = difficulty_icon.get(diff, "⚪")
        label = f"問{q['number']}　[{q.get('type', '')}]　{icon} {diff}　{q.get('points', 0)}点"

        with st.expander(label, expanded=True):
            st.markdown(f"**{q['question']}**")
            st.divider()

            col_ans, col_rub = st.columns([1, 1])

            with col_ans:
                st.markdown("##### 模範解答")
                st.info(q.get("answer", "（解答なし）"))

            with col_rub:
                st.markdown("##### 採点ルーブリック（観点別評価）")
                rubric = q.get("rubric", {})
                for key, val in rubric.items():
                    if val:
                        st.markdown(f"**{key}**")
                        st.caption(val)

    st.divider()

    # ダウンロード
    st.subheader("📥 ダウンロード")
    file_prefix = f"{grade_d}_{subject_d}_{unit_d}".replace(" ", "_").replace("・", "-")

    md_text = result_to_markdown(result, grade_d, subject_d, unit_d)
    json_text = json.dumps(result, ensure_ascii=False, indent=2)

    col_dl1, col_dl2 = st.columns(2)
    with col_dl1:
        st.download_button(
            label="📄 Markdown でダウンロード",
            data=md_text.encode("utf-8"),
            file_name=f"{file_prefix}_問題.md",
            mime="text/markdown",
            use_container_width=True,
        )
    with col_dl2:
        st.download_button(
            label="📋 JSON でダウンロード（採点システム連携用）",
            data=json_text.encode("utf-8"),
            file_name=f"{file_prefix}_data.json",
            mime="application/json",
            use_container_width=True,
        )

    # Markdownプレビュー
    with st.expander("📄 Markdownプレビュー"):
        st.text_area("コピー用", md_text, height=400)
