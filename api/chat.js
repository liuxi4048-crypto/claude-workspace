// Vercel Edge Function: スマホからのチャット要求を Google Gemini に中継する。
// APIキーはこのサーバ側だけに置き、スマホ(クライアント)には一切渡さない。
// クライアントには Gemini の SSE を「生テキストの逐次ストリーム」に変換して返す。
export const config = { runtime: 'edge' }

const DEFAULT_MODEL = 'gemini-2.0-flash'

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() })
  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405, headers: cors() })
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return new Response(
      'サーバに GEMINI_API_KEY が設定されていません。Vercel の Settings → Environment Variables に登録してください。',
      { status: 503, headers: cors() }
    )
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL

  let body
  try {
    body = await req.json()
  } catch {
    return new Response('リクエストJSONが不正です', { status: 400, headers: cors() })
  }

  const messages = Array.isArray(body.messages) ? body.messages : []
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7
  const maxTokens = typeof body.maxTokens === 'number' ? body.maxTokens : 1024

  // system は system_instruction に、user/assistant は contents(assistant→model)に変換
  const systemText = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n')
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    }))

  const geminiBody = {
    contents,
    generationConfig: { temperature, maxOutputTokens: maxTokens, topP: 0.9 },
  }
  if (systemText) geminiBody.system_instruction = { parts: [{ text: systemText }] }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent` +
    `?alt=sse&key=${encodeURIComponent(key)}`

  let upstream
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(geminiBody),
    })
  } catch (e) {
    return new Response(`Gemini への接続に失敗しました: ${e?.message || e}`, {
      status: 502,
      headers: cors(),
    })
  }

  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => '')
    return new Response(`Gemini API エラー (${upstream.status}): ${t.slice(0, 800)}`, {
      status: 502,
      headers: cors(),
    })
  }

  // SSE(data: {...})を生テキストの逐次ストリームに変換
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader()
      const dec = new TextDecoder()
      const enc = new TextEncoder()
      let buf = ''
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            const l = line.trim()
            if (!l.startsWith('data:')) continue
            const payload = l.slice(5).trim()
            if (!payload || payload === '[DONE]') continue
            try {
              const j = JSON.parse(payload)
              const parts = j?.candidates?.[0]?.content?.parts
              if (Array.isArray(parts)) {
                for (const p of parts) {
                  if (p?.text) controller.enqueue(enc.encode(p.text))
                }
              }
            } catch {
              /* 部分的なJSONは無視 */
            }
          }
        }
      } catch {
        /* ストリーム中断は無視 */
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      ...cors(),
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
