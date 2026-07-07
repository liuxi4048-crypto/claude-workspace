// エントリポイント: タブ制御 + バックエンド疎通確認
// (推論はクラウドなので、モデルのロードやWebGPU判定は不要)
import { checkBackend, backendStatusText } from './llm.js'
import { initChat } from './modes/chat.js'
import { initSummarize } from './modes/summarize.js'
import { initCalc } from './modes/calc.js'
import './style.css'

function $(id) {
  return document.getElementById(id)
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab')
  const panels = document.querySelectorAll('.tab-panel')
  tabs.forEach((tab) =>
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'))
      panels.forEach((p) => p.classList.remove('active'))
      tab.classList.add('active')
      $(`tab-${tab.dataset.tab}`).classList.add('active')
    })
  )
}

async function main() {
  setupTabs()
  initChat()
  initSummarize()
  initCalc()

  // バックエンド(Vercel関数 + Gemini)への疎通確認
  const status = await checkBackend()
  const badge = $('backend-badge')
  if (status.ok) {
    badge.textContent = `☁️ ${status.model || 'Gemini'}`
    badge.hidden = false
  } else {
    $('backend-warning-text').textContent = backendStatusText()
    $('backend-warning').hidden = false
    // 送信系ボタンを無効化
    document.querySelectorAll('#chat-send, #sum-run, #calc-form button[type=submit]').forEach((b) => {
      b.disabled = true
    })
  }
}

main()

// PWA Service Worker 登録(本番ビルドのみ)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((e) => console.warn('SW registration failed', e))
  })
}
