// クラウド推論クライアント: スマホは計算せず、Vercel の /api/chat 経由で
// Google Gemini に問い合わせる薄いクライアント。
//
// 経緯: 端末内推論(WebGPU / WASM)はモバイルGPUの不具合や速度で安定しなかったため、
// 計算をサーバ側に逃がす構成に変更。スマホは入力送信と結果表示だけを担う。

// github.io から開かれた場合は Vercel のバックエンドを叩く(Pagesには関数が無いため)。
// 同一オリジン(Vercel)配信時は相対パスで自オリジンの関数を使う。
const VERCEL_BACKEND = 'https://claude-workspace-two-alpha.vercel.app'
export const API_BASE =
  typeof location !== 'undefined' && location.hostname.endsWith('github.io') ? VERCEL_BACKEND : ''

// 楽観的に true 始まり。疎通確認が失敗した場合のみ false にする(初回送信の取りこぼし防止)。
let backendReady = true
let backendReason = ''
let abortController = null

export function isReady() {
  return backendReady
}

export function backendStatusText() {
  return backendReason
}

// バックエンドの状態確認(APIキー設定済みか)
export async function checkBackend() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' })
    if (!res.ok) {
      backendReady = false
      backendReason = `バックエンド応答エラー (${res.status})`
      return { ok: false, reason: backendReason }
    }
    const data = await res.json()
    if (!data.keyConfigured) {
      backendReady = false
      backendReason =
        'サーバに GEMINI_API_KEY が未設定です。Vercel の Settings → Environment Variables で登録してください。'
      return { ok: false, reason: backendReason, keyMissing: true }
    }
    backendReady = true
    backendReason = `接続OK(モデル: ${data.model})`
    return { ok: true, model: data.model }
  } catch (e) {
    backendReady = false
    backendReason =
      `バックエンドに接続できません: ${e?.message || e}\n` +
      'クラウド版は Vercel のURLで開いてください(GitHub Pages 単体では動きません)。'
    return { ok: false, reason: backendReason }
  }
}

export function stopGeneration() {
  abortController?.abort()
}

// 破損検知は保険(クラウド応答では基本不要)
export function looksCorrupted(text) {
  if (!text) return false
  const specialTokenHit = /<pad>|<unk>|<\|[^|]*\|>|\[PAD\]|\[UNK\]/i.test(text)
  const symbolSpam = /([!?#*_~])\1{4,}/.test(text)
  return specialTokenHit || symbolSpam
}

export const CORRUPTION_WARNING =
  '⚠ 応答に異常な文字列が含まれています。もう一度お試しください。'

/**
 * メッセージ配列から応答を生成する。
 * messages: [{ role: 'system'|'user'|'assistant', content }]
 * onToken(cumulativeText) がストリーミング中に呼ばれる。
 * 戻り値: 最終応答テキスト。
 */
export async function generate(messages, onToken, opts = {}) {
  abortController = new AbortController()
  let res
  try {
    res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages,
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 1024,
      }),
      signal: abortController.signal,
    })
  } catch (e) {
    if (e?.name === 'AbortError') return ''
    throw new Error(`通信に失敗しました: ${e?.message || e}`)
  }

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `サーバエラー (${res.status})`)
  }

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let text = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      text += dec.decode(value, { stream: true })
      onToken?.(text)
    }
  } catch (e) {
    if (e?.name !== 'AbortError') throw e
  } finally {
    abortController = null
  }
  return text.trim()
}
