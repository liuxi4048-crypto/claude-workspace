// バックエンドの疎通確認用。APIキーが設定されているかをクライアントに知らせる。
export const config = { runtime: 'edge' }

export default async function handler() {
  return new Response(
    JSON.stringify({
      ok: true,
      keyConfigured: !!process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    }),
    {
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'cache-control': 'no-store',
      },
    }
  )
}
