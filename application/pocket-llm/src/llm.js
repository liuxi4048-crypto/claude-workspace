// WebLLM エンジン管理: モデル定義・ロード・ストリーミング生成
import { CreateMLCEngine, deleteModelAllInfoInCache } from '@mlc-ai/web-llm'

// スマホ向けモデルカタログ(web-llm prebuilt)。
// 方針: まず「確実に載る」ことを最優先。最小・成熟モデル(f16=バッファが小さい)を既定にし、
// もし出力が「!!!!」に化ける端末では f32 版に切り替えられるよう両方を用意する。
// ・f16 = バッファが小さく読込しやすいが、一部GPUで数値が不安定
// ・f32 = 数値は安定するがバッファが大きく、読込に失敗しやすい
// ⚠「Buffer was unmapped...」はデバイスロスト/バッファ破棄で、モデルの大小と無関係に起きうる。
export const MODELS = [
  {
    id: 'gemma-2-2b-jpn-it-q4f16_1-MLC',
    label: 'Gemma 2 2B 日本語版(既定・最も載りやすい)',
    note: 'DL約1.4GB / VRAM約1.9GB。Google の日本語モデル。まずはこれで動作確認を',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 1.5B(超軽量・高速)',
    note: 'DL約1GB / VRAM約1.6GB。最も軽い。読込に失敗するならこれを試す',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B(最小・最終手段)',
    note: 'DL約0.7GB / VRAM約0.9GB。最小構成。これでも失敗するなら端末/ブラウザ側の問題',
  },
  {
    id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 3B(高品質)',
    note: 'DL約2GB / VRAM約2.5GB。より賢いが少し重い。安定動作を確認できたら',
  },
  {
    id: 'gemma-2-2b-jpn-it-q4f32_1-MLC',
    label: 'Gemma 2 2B 日本語版・安定版(f32)',
    note: 'DL約1.4GB / VRAM約2.5GB。出力が「!!!!」に化ける場合はこの f32 版を使う',
  },
  {
    id: 'Qwen2.5-3B-Instruct-q4f32_1-MLC',
    label: 'Qwen2.5 3B・安定版(f32)',
    note: 'DL約2GB / VRAM約2.9GB。高品質かつ数値安定だが最も重い',
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

// 端末の WebGPU 情報を取得(診断用)。読込失敗時の原因切り分けに使う。
export async function getGpuDiagnostics() {
  try {
    if (!('gpu' in navigator)) return 'navigator.gpu なし(WebGPU非対応)'
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) return 'GPUアダプタ取得不可(requestAdapter が null)'
    const L = adapter.limits
    const mb = (n) => (n ? `${Math.round(n / 1048576)}MB` : '不明')
    const info = adapter.info || {}
    return [
      `GPU: ${info.vendor || '?'} / ${info.architecture || info.description || '?'}`,
      `maxBufferSize: ${mb(L.maxBufferSize)}`,
      `maxStorageBufferBindingSize: ${mb(L.maxStorageBufferBindingSize)}`,
    ].join('\n')
  } catch (e) {
    return `診断取得エラー: ${e?.message || e}`
  }
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
  try {
    engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (p) => onProgress?.(p),
    })
  } catch (err) {
    // 失敗時はエンジンを確実に破棄し、次の試行が汚染された状態を引き継がないようにする
    try {
      await engine?.unload?.()
    } catch {
      /* noop */
    }
    engine = null
    currentModelId = null
    throw err
  }
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
