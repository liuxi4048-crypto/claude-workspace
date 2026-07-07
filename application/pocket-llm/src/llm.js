// 推論エンジン管理: Transformers.js を CPU(WASM) で駆動する。
//
// 経緯: 当初は @mlc-ai/web-llm (WebGPU) を使っていたが、モバイルChromeの
// WebGPUドライバとの相性で以下2つの症状が交互に出て安定しなかった:
//   - f16モデル → 「!!!!」や <pad> トークン混入(f16数値不安定)
//   - f32モデル → "Buffer was unmapped before mapping was resolved"
//                (web-llm 側の既知バグ・未解決)
// そのため WebGPU を撤廃し、Transformers.js の WASM(CPU)推論に移行。
// 速度は遅いが「動く/動かない」のバラツキがなく、確実に応答が返る。
import {
  pipeline,
  TextStreamer,
  InterruptableStoppingCriteria,
  env,
} from '@huggingface/transformers'

// WASM専用に固定(WebGPUの罠を回避)
env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency
  ? Math.min(navigator.hardwareConcurrency, 4)
  : 2

export const MODELS = [
  {
    id: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    label: 'SmolLM2 360M(既定・最速)',
    note: 'DL約0.3GB。CPUでも軽快に動く最小構成。まずはこれで動作確認',
  },
  {
    id: 'onnx-community/Qwen2.5-0.5B-Instruct',
    label: 'Qwen2.5 0.5B(バランス)',
    note: 'DL約0.4GB。軽さと賢さのバランス。日本語もそれなりに扱える',
  },
  {
    id: 'HuggingFaceTB/SmolLM2-1.7B-Instruct',
    label: 'SmolLM2 1.7B(高品質・重め)',
    note: 'DL約1GB。より賢い応答だが CPU では遅め(スマホで数トークン/秒)',
  },
  {
    id: 'onnx-community/Qwen2.5-1.5B-Instruct',
    label: 'Qwen2.5 1.5B(高品質・重め)',
    note: 'DL約1GB。日本語に強い。CPU推論なので待ち時間長め',
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

let generator = null
let currentModelId = null
let stopper = null

export function isReady() {
  return generator !== null
}

export function currentModel() {
  return MODELS.find((m) => m.id === currentModelId) || null
}

export async function loadModel(modelId, onProgress) {
  // 前のモデルを破棄
  if (generator) {
    try {
      await generator.dispose?.()
    } catch {
      /* noop */
    }
  }
  generator = null
  currentModelId = null
  try {
    generator = await pipeline('text-generation', modelId, {
      device: 'wasm',
      dtype: 'q4',
      progress_callback: (data) => {
        if (data.status === 'progress') {
          onProgress?.({
            progress: (data.progress || 0) / 100,
            text: `${data.file || 'モデル'}: ${Math.round(data.progress || 0)}%`,
          })
        } else if (data.status === 'ready') {
          onProgress?.({ progress: 1, text: '準備完了' })
        }
      },
    })
  } catch (err) {
    generator = null
    currentModelId = null
    throw err
  }
  currentModelId = modelId
  saveModel(modelId)
  return generator
}

export async function clearModelCache() {
  // Transformers.js はブラウザの Cache Storage を使う
  if ('caches' in self) {
    try {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => /transformers|huggingface|models/i.test(k)).map((k) => caches.delete(k))
      )
    } catch {
      /* noop */
    }
  }
}

export function stopGeneration() {
  stopper?.interrupt()
}

// f16 の数値不安定は WASM経路では発生しないため、破損検知は無害な保険として残す
export function looksCorrupted(text) {
  if (!text) return false
  const specialTokenHit = /<pad>|<unk>|<\|[^|]*\|>|\[PAD\]|\[UNK\]/i.test(text)
  const symbolSpam = /([!?#*_~])\1{4,}/.test(text)
  return specialTokenHit || symbolSpam
}

export const CORRUPTION_WARNING =
  '⚠ 応答に異常な文字列が含まれています。別のモデルを試すか、履歴をクリアしてやり直してください。'

/**
 * チャットメッセージから応答を生成する。
 * onToken(cumulativeText) がストリーミング途中で呼ばれる。
 * 戻り値: 最終応答テキスト。
 */
export async function generate(messages, onToken, opts = {}) {
  if (!generator) throw new Error('モデルが未ロードです')
  stopper = new InterruptableStoppingCriteria()

  let text = ''
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (chunk) => {
      text += chunk
      onToken?.(text)
    },
  })

  const output = await generator(messages, {
    max_new_tokens: opts.maxTokens ?? 512,
    do_sample: (opts.temperature ?? 0.7) > 0,
    temperature: opts.temperature ?? 0.7,
    top_p: 0.9,
    repetition_penalty: 1.1,
    streamer,
    stopping_criteria: stopper,
    return_full_text: false,
  })

  stopper = null

  // ストリーマから拾えなかった場合の保険: output の内容を最終テキストに
  if (!text && Array.isArray(output) && output.length > 0) {
    const generated = output[0].generated_text
    if (typeof generated === 'string') text = generated
    else if (Array.isArray(generated)) {
      const last = generated[generated.length - 1]
      text = last?.content || ''
    }
  }
  return text.trim()
}

// GPU情報はもう不要だが、UIから呼ばれているため空実装で維持
export async function getGpuDiagnostics() {
  return `推論エンジン: Transformers.js (CPU / WASM)\nスレッド数: ${env.backends.onnx.wasm.numThreads}`
}
