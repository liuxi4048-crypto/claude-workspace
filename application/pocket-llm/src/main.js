// エントリポイント: WebGPU 判定・モデルロード・タブ制御・設定
import {
  MODELS,
  getSavedModel,
  loadModel,
  clearModelCache,
  currentModel,
} from './llm.js'
import { initChat } from './modes/chat.js'
import { initSummarize } from './modes/summarize.js'
import { initCalc } from './modes/calc.js'
import './style.css'

function $(id) {
  return document.getElementById(id)
}

function fillModelSelect(selectEl, selected) {
  selectEl.innerHTML = ''
  for (const m of MODELS) {
    const opt = document.createElement('option')
    opt.value = m.id
    opt.textContent = m.label
    if (m.id === selected) opt.selected = true
    selectEl.appendChild(opt)
  }
}

async function checkWebGPU() {
  if (!('gpu' in navigator)) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
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

async function startLoad(modelId) {
  const loadBtn = $('btn-load')
  const progressWrap = $('load-progress')
  const progressFill = $('progress-fill')
  const progressText = $('progress-text')

  loadBtn.disabled = true
  progressWrap.hidden = false
  progressText.textContent = '準備中…'

  try {
    await loadModel(modelId, (p) => {
      progressFill.style.width = `${Math.round((p.progress || 0) * 100)}%`
      progressText.textContent = p.text || ''
    })
    // ロード完了 → メインUIへ
    $('load-panel').hidden = true
    $('main-ui').hidden = false
    const badge = $('model-badge')
    badge.textContent = currentModel()?.label?.split('(')[0]?.trim() || modelId
    badge.hidden = false
  } catch (err) {
    progressText.textContent =
      `ロードに失敗しました: ${err.message}\n` +
      'メモリ不足の可能性があります。より軽量なモデルを選んで再試行してください。'
    progressFill.style.width = '0%'
  } finally {
    loadBtn.disabled = false
  }
}

function setupSettings() {
  const dialog = $('settings-dialog')
  const select = $('settings-model-select')
  $('btn-settings').addEventListener('click', () => {
    fillModelSelect(select, getSavedModel())
    dialog.showModal()
  })
  $('btn-close-settings').addEventListener('click', () => dialog.close())
  $('btn-reload-model').addEventListener('click', () => {
    dialog.close()
    // ロードパネルに戻して選択モデルで再ロード
    $('main-ui').hidden = true
    $('load-panel').hidden = false
    fillModelSelect($('model-select'), select.value)
    updateModelNote(select.value)
    startLoad(select.value)
  })
  $('btn-clear-cache').addEventListener('click', async () => {
    if (!confirm('ダウンロード済みのモデルをすべて削除しますか?(次回また数GBのダウンロードが必要になります)')) return
    await clearModelCache()
    alert('モデルキャッシュを削除しました')
  })
}

function updateModelNote(modelId) {
  const m = MODELS.find((x) => x.id === modelId)
  $('model-note').textContent = m ? m.note : ''
}

async function main() {
  setupTabs()
  initChat()
  initSummarize()
  initCalc()
  setupSettings()

  const modelSelect = $('model-select')
  fillModelSelect(modelSelect, getSavedModel())
  updateModelNote(modelSelect.value)
  modelSelect.addEventListener('change', () => updateModelNote(modelSelect.value))

  const hasWebGPU = await checkWebGPU()
  if (!hasWebGPU) {
    $('webgpu-warning').hidden = false
    $('btn-load').disabled = true
    $('load-panel').querySelector('.hint').textContent =
      'WebGPU が有効になるとここからモデルをロードできます。'
    return
  }

  $('btn-load').addEventListener('click', () => startLoad(modelSelect.value))
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
