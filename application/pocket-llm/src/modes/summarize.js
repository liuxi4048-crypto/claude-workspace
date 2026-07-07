// 要約モード: 貼り付けテキストをスタイル指定で要約
import { generate, stopGeneration, isReady, looksCorrupted, CORRUPTION_WARNING } from '../llm.js'

export const CHAR_LIMIT = 6000

const STYLE_PROMPTS = {
  short: '次のテキストを日本語で1〜2文に要約してください。要約のみを出力してください。',
  medium:
    '次のテキストを日本語で1段落(3〜5文)に要約してください。重要なポイントを漏らさず、要約のみを出力してください。',
  bullets:
    '次のテキストの要点を日本語の箇条書き(3〜7項目、各1行)でまとめてください。箇条書きのみを出力してください。',
}

let style = 'short'
let generating = false

export function initSummarize() {
  const input = document.getElementById('sum-input')
  const count = document.getElementById('sum-count')
  const runBtn = document.getElementById('sum-run')
  const stopBtn = document.getElementById('sum-stop')
  const output = document.getElementById('sum-output')
  const chips = document.querySelectorAll('#sum-style .chip')
  document.getElementById('sum-limit').textContent = CHAR_LIMIT.toLocaleString('ja-JP')

  input.addEventListener('input', () => {
    const len = input.value.length
    count.textContent = `${len.toLocaleString('ja-JP')} 文字`
    count.classList.toggle('over', len > CHAR_LIMIT)
  })

  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'))
      chip.classList.add('active')
      style = chip.dataset.style
    })
  )

  runBtn.addEventListener('click', async () => {
    if (generating || !isReady()) return
    const text = input.value.trim()
    if (!text) {
      output.hidden = false
      output.textContent = '要約するテキストを入力してください。'
      return
    }
    if (text.length > CHAR_LIMIT) {
      output.hidden = false
      output.textContent =
        `テキストが長すぎます(${text.length.toLocaleString('ja-JP')} 文字)。` +
        `${CHAR_LIMIT.toLocaleString('ja-JP')} 文字以下に分割してから要約してください。` +
        '(スマホ内モデルのメモリ制約のためです)'
      return
    }

    generating = true
    runBtn.disabled = true
    stopBtn.hidden = false
    output.hidden = false
    output.textContent = '要約中…'
    try {
      const summary = await generate(
        [
          { role: 'system', content: 'あなたは要約の専門家です。' },
          { role: 'user', content: `${STYLE_PROMPTS[style]}\n\n---\n${text}` },
        ],
        (partial) => {
          output.textContent = partial
        },
        { temperature: 0.3 }
      )
      output.textContent = summary || '(要約が生成されませんでした)'
      if (looksCorrupted(summary)) {
        output.textContent += `\n\n${CORRUPTION_WARNING}`
      }
    } catch (err) {
      output.textContent = `エラー: ${err.message}`
    } finally {
      generating = false
      runBtn.disabled = false
      stopBtn.hidden = true
    }
  })

  stopBtn.addEventListener('click', () => stopGeneration())
}
