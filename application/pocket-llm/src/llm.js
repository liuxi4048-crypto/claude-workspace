// WebLLM エンジン管理: モデル定義・ロード・ストリーミング生成
import { CreateMLCEngine, deleteModelAllInfoInCache } from '@mlc-ai/web-llm'

// スマホ向けモデルカタログ(web-llm prebuilt)。vram はロードに必要な GPU メモリの目安。
export const MODELS = [
  {
    id: 'Qwen3.5-4B-q4f16_1-MLC',
    label: 'Qwen3.5 4B(既定・高品質)',
    note: 'DL約2.5GB / 要RAM 8GB以上。日本語・要約・推論に強い最新世代',
  },
  {
    id: 'Qwen3.5-2B-q4f16_1-MLC',
    label: 'Qwen3.5 2B(バランス)',
    note: 'DL約1.4GB / 要RAM 6GB以上。軽さと賢さのバランス',
  },
  {
    id: 'gemma-2-2b-jpn-it-q4f16_1-MLC',
    label: 'Gemma 2 2B 日本語版(軽め)',
    note: 'DL約1.4GB / 要RAM 6GB以上。日本語チューニング済み',
  },
  {
    id: 'Qwen3.5-0.8B-q4f16_1-MLC',
    label: 'Qwen3.5 0.8B(超軽量)',
    note: 'DL約0.6GB / 要RAM 4GB以上。低スペック端末向け',
  },
  {
    id: 'Qwen3.5-9B-q4f16_1-MLC',
    label: 'Qwen3.5 9B(最高品質)',
    note: 'DL約5.2GB / 要RAM 12GB以上。フラッグシップ端末のみ',
  },
]

export const DEFAULT_MODEL = MODELS[0].id
const MODEL_STORE_KEY = 'pocket-llm.model'

export function getSavedModel() {
  const saved = localStorage.getItem(MODEL_STORE_KEY)
  return MODELS.some((m) => m.id === saved) ? saved : DEFAULT_MODEL
}

export function saveModel(id) {
  localStorage.setItem(MODEL_STORE_KEY, id)
}

let engine = null
let currentModelId = null
let aborted = false

export function isReady() {
  return engine !== null
}

export function currentModel() {
  return MODELS.find((m) => m.id === currentModelId) || null
}

export async function loadModel(modelId, onProgress) {
  engine = null
  currentModelId = null
  engine = await CreateMLCEngine(modelId, {
    initProgressCallback: (p) => onProgress?.(p),
  })
  currentModelId = modelId
  saveModel(modelId)
  return engine
}

export async function clearModelCache() {
  for (const m of MODELS) {
    try {
      await deleteModelAllInfoInCache(m.id)
    } catch {
      /* 未キャッシュのモデルは無視 */
    }
  }
}

export function stopGeneration() {
  aborted = true
  engine?.interruptGenerate()
}

// Qwen3 系の <think>...</think> ブロックを表示から除去しつつストリームする
export async function* streamChat(messages, opts = {}) {
  if (!engine) throw new Error('モデルが未ロードです')
  aborted = false
  const chunks = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
    extra_body: { enable_thinking: false },
  })
  let buf = ''
  let inThink = false
  for await (const chunk of chunks) {
    if (aborted) break
    const delta = chunk.choices[0]?.delta?.content || ''
    if (!delta) continue
    buf += delta
    // <think> タグの途中でチャンクが切れる場合に備えてバッファ処理
    let out = ''
    while (buf.length > 0) {
      if (inThink) {
        const end = buf.indexOf('</think>')
        if (end === -1) {
          buf = buf.slice(-10) // タグ断片だけ残して捨てる
          break
        }
        buf = buf.slice(end + 8)
        inThink = false
      } else {
        const start = buf.indexOf('<think>')
        if (start === -1) {
          // タグの先頭断片かもしれない末尾は保留する
          const safeLen = buf.length - 7
          if (safeLen > 0) {
            out += buf.slice(0, safeLen)
            buf = buf.slice(safeLen)
          }
          break
        }
        out += buf.slice(0, start)
        buf = buf.slice(start + 7)
        inThink = true
      }
    }
    if (out) yield out
  }
  // ストリーム終了後、保留分を出力
  if (!inThink && buf && !buf.includes('<think')) yield buf
}

// ストリーム全体を文字列に集約(コールバックで途中経過を通知)
export async function generate(messages, onToken, opts = {}) {
  let text = ''
  for await (const tok of streamChat(messages, opts)) {
    text += tok
    onToken?.(text)
  }
  return text.trim()
}
