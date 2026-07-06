// WebLLM エンジン管理: モデル定義・ロード・ストリーミング生成
import { CreateMLCEngine, deleteModelAllInfoInCache } from '@mlc-ai/web-llm'

// スマホ向けモデルカタログ(web-llm prebuilt)。
// すべて q4f32_1(f32)= モバイルGPU(Adreno/Mali)の f16 数値不安定による
// 出力破損(「!!!!」羅列)を避けるための安定版。vram は必要 GPU メモリの目安。
// ⚠ モバイルChromeのWebGPUは system RAM が十分でも GPU バッファ確保に上限があり、
// 7B級以上は多くの端末で「Buffer was unmapped...」等で読込失敗する。実用上限は概ね3〜4B。
// そのため既定は確実に動く 3B とし、大型モデルは「失敗する場合あり」と明示。
export const MODELS = [
  {
    id: 'Qwen2.5-3B-Instruct-q4f32_1-MLC',
    label: 'Qwen2.5 3B(既定・推奨)',
    note: 'DL約2GB / VRAM約2.9GB。実機で安定して動く中で最も高品質。日本語・要約・推論に強い',
  },
  {
    id: 'gemma-2-2b-jpn-it-q4f32_1-MLC',
    label: 'Gemma 2 2B 日本語版(最も安定)',
    note: 'DL約1.4GB / VRAM約2.5GB。Google の日本語チューニング済み。困ったらこれ',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    label: 'Qwen2.5 1.5B(超軽量)',
    note: 'DL約1GB / VRAM約1.9GB。最も軽く高速。低スペック端末向け',
  },
  {
    id: 'Qwen2.5-7B-Instruct-q4f32_1-MLC',
    label: 'Qwen2.5 7B(大型・端末により失敗)',
    note: 'DL約4.5GB / VRAM約5.9GB。最高品質だがモバイルGPUの上限を超えやすく、読込に失敗する端末が多い',
  },
  {
    id: 'Qwen3.5-9B-q4f32_1-MLC',
    label: 'Qwen3.5 9B(実験・最大)',
    note: 'DL約5.5GB / VRAM約7.5GB。ハイエンドPC向け。スマホではほぼ読込失敗します',
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
  // 前のエンジンが GPU バッファを掴んだままだと再ロード時に破棄競合が起きるため、明示的に解放する
  if (engine) {
    try {
      await engine.unload()
    } catch {
      /* 解放失敗は無視して続行 */
    }
  }
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
