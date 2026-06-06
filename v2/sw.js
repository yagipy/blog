const CACHE_VERSION = 'v1'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const MD_CACHE = `md-${CACHE_VERSION}`

const PRECACHE_URLS = [
  '/',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.registration.navigationPreload?.enable(),
      caches.keys()
        .then(keys =>
          Promise.all(
            keys
              .filter(k => k !== STATIC_CACHE && k !== MD_CACHE)
              .map(k => caches.delete(k))
          )
        ),
    ]).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  // ナビゲーション: Navigation Preload でネットワーク優先、失敗時はキャッシュへ
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse
        if (preload) return preload
        return await fetch(event.request)
      } catch {
        return (await caches.match('/')) ?? Response.error()
      }
    })())
    return
  }

  // devtools など no-store リクエストはキャッシュをバイパス
  if (event.request.cache === 'no-store') {
    event.respondWith(fetch(event.request))
    return
  }

  const url = new URL(event.request.url)

  // index.json: network-first, cache by pathname (strip ?t= timestamp)
  if (url.pathname.endsWith('index.json')) {
    const cacheKey = new Request(url.pathname)
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok && event.request.method === 'GET') {
            const clone = res.clone()
            caches.open(STATIC_CACHE).then(c => c.put(cacheKey, clone)).catch(() => {})
          }
          return res
        })
        .catch(() => caches.open(STATIC_CACHE).then(c => c.match(cacheKey)).then(r => r || Response.error()).catch(() => Response.error()))
    )
    return
  }

  // Markdown files: cache-first, only cache successful responses
  if (url.pathname.endsWith('.md')) {
    event.respondWith(
      caches.open(MD_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached
          return fetch(event.request).then(res => {
            if (res.ok && event.request.method === 'GET') cache.put(event.request, res.clone()).catch(() => {})
            return res
          }).catch(() => Response.error())
        })
      )
    )
    return
  }

  // Static files: cache-first, GET only
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(res => {
        if (res.ok && event.request.method === 'GET') {
          const clone = res.clone()
          caches.open(STATIC_CACHE).then(c => c.put(event.request, clone)).catch(() => {})
        }
        return res
      }).catch(() => Response.error())
    })
  )
})
