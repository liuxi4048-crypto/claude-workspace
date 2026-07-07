// チャットモード: ストリーミング応答 + localStorage 履歴
import { generate, stopGeneration, isReady, looksCorrupted, CORRUPTION_WARNING } from '../llm.js'

const HISTORY_KEY = 'pocket-llm.chat-history'
const SYSTEM_PROMPT =
  'あなたは親切で有能な日本語AIアシスタントです。簡潔で分かりやすく答えてください。' +
  '正確な数値計算が必要な場合は、途中式を示しつつ「計算タブの利用」も案内してください。' +
  '知らないことは正直に「分かりません」と答えてください。'

let history = []
let generating = false

function loadHistory() {
  try {
    history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || []
  } catch {
    history = []
  }
}

function saveHistory() {
  // 長くなりすぎないよう直近30往復のみ保存
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-60)))
}

function appendBubble(container, role, text) {
  const div = document.createElement('div')
  div.className = `bubble ${role}`
  div.textContent = text
  container.appendChild(div)
  container.scrollTop = container.scrollHeight
  return div
}

export function initChat() {
  const messagesEl = document.getElementById('chat-messages')
  const form = document.getElementById('chat-form')
  const input = document.getElementById('chat-input')
  const sendBtn = document.getElementById('chat-send')
  const stopBtn = document.getElementById('chat-stop')
  const clearBtn = document.getElementById('chat-clear')

  loadHistory()
  for (const m of history) appendBubble(messagesEl, m.role, m.content)

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (generating || !isReady()) return
    const text = input.value.trim()
    if (!text) return
    input.value = ''
    input.style.height = 'auto'

    appendBubble(messagesEl, 'user', text)
    history.push({ role: 'user', content: text })

    const bubble = appendBubble(messagesEl, 'assistant', '…')
    generating = true
    sendBtn.disabled = true
    stopBtn.hidden = false
    try {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.slice(-12), // 直近6往復をコンテキストに
      ]
      const reply = await generate(messages, (partial) => {
        bubble.textContent = partial
        messagesEl.scrollTop = messagesEl.scrollHeight
      })
      bubble.textContent = reply || '(応答が生成されませんでした)'
      if (looksCorrupted(reply)) {
        bubble.textContent += `\n\n${CORRUPTION_WARNING}`
        bubble.classList.add('error')
      }
      history.push({ role: 'assistant', content: reply })
      saveHistory()
    } catch (err) {
      bubble.textContent = `エラー: ${err.message}`
      bubble.classList.add('error')
    } finally {
      generating = false
      sendBtn.disabled = false
      stopBtn.hidden = true
    }
  })

  stopBtn.addEventListener('click', () => stopGeneration())

  clearBtn.addEventListener('click', () => {
    if (!confirm('チャット履歴を削除しますか?')) return
    history = []
    saveHistory()
    messagesEl.innerHTML = ''
  })

  // テキストエリアの自動リサイズ
  input.addEventListener('input', () => {
    input.style.height = 'auto'
    input.style.height = Math.min(input.scrollHeight, 120) + 'px'
  })
}
