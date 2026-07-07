// 計算モード: 数式は電卓エンジンで正確に、文章題は LLM で
import { generate, stopGeneration, isReady, looksCorrupted, CORRUPTION_WARNING } from '../llm.js'
import { looksLikeMath, evaluate, formatResult } from '../mathparser.js'

let generating = false

export function initCalc() {
  const form = document.getElementById('calc-form')
  const input = document.getElementById('calc-input')
  const stopBtn = document.getElementById('calc-stop')
  const output = document.getElementById('calc-output')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const text = input.value.trim()
    if (!text) return
    output.hidden = false

    // 1) 純粋な数式 → 電卓エンジンで正確に計算(LLM 不使用)
    if (looksLikeMath(text)) {
      const result = evaluate(text)
      if (result.ok) {
        output.innerHTML = ''
        const answer = document.createElement('div')
        answer.className = 'calc-answer'
        answer.textContent = `= ${formatResult(result.value)}`
        const note = document.createElement('p')
        note.className = 'hint'
        note.textContent = '✓ 電卓エンジンによる正確な計算結果です'
        output.append(answer, note)
      } else {
        output.textContent = `数式エラー: ${result.error}`
      }
      return
    }

    // 2) 文章題・単位換算など → LLM に途中式付きで解かせる
    if (generating || !isReady()) return
    generating = true
    stopBtn.hidden = false
    output.textContent = '考え中…'
    try {
      const answer = await generate(
        [
          {
            role: 'system',
            content:
              'あなたは数学と計算の得意なアシスタントです。' +
              '問題を解くときは、まず立式し、途中式を短く示してから答えを出してください。' +
              '最後に「答え: 〜」の形式で結論を1行で示してください。日本語で答えてください。',
          },
          { role: 'user', content: text },
        ],
        (partial) => {
          output.textContent = partial
        },
        { temperature: 0.2 }
      )
      output.textContent = answer || '(応答が生成されませんでした)'
      const note = document.createElement('p')
      note.className = 'hint'
      note.textContent = looksCorrupted(answer)
        ? CORRUPTION_WARNING
        : '⚠ AIによる解答です。重要な計算は電卓で検算してください(数式だけ入力すると正確に計算します)'
      output.appendChild(note)
    } catch (err) {
      output.textContent = `エラー: ${err.message}`
    } finally {
      generating = false
      stopBtn.hidden = true
    }
  })

  stopBtn.addEventListener('click', () => stopGeneration())
}
