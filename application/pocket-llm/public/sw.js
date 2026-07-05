// Pocket LLM Service Worker — アプリシェルをキャッシュしてオフライン起動を可能にする
// (モデル本体は WebLLM が Cache API に別途保存する)
const CACHE_NAME = 'pocket-llm-shell-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  // ビルドごとにファイル名が変わるため、fetch 時に動的キャッシュする方式
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('pocket-llm-shell-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // 同一オリジンの GET のみ対象(モデルDL等の外部リクエストは素通し)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return

  // ネットワーク優先 + キャッシュフォールバック(オフライン時はキャッシュから起動)
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return res
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  )
})
