// OGP meta tag injector — Cloudflare Pages Function
// ポストページのHTMLリクエストにOGP <meta> タグを注入する。
// 静的ファイル（JS・CSS・画像等）はそのまま env.ASSETS に転送する。

export async function onRequest({ request, env }) {
  const url = new URL(request.url)
  const path = url.pathname

  // ファイル拡張子あり、または /posts/ /src/ /dev/ 等は静的アセットに転送
  if (hasExtension(path) || isAssetPath(path)) {
    return env.ASSETS.fetch(request)
  }

  // スラッグパターン: /yyyy-mm-dd-slug または /tags /tags/xxx 等
  const isPost = /^\/[\w-]+$/.test(path) && path !== '/tags'
  const isTagDetail = path.startsWith('/tags/')
  const slug = isPost ? path.slice(1) : (isTagDetail ? path.slice('/tags/'.length) : null)

  // index.html と posts/index.json を並列取得（slug がある場合は両方必要）
  const htmlFetch  = env.ASSETS.fetch(new Request(`${url.origin}/index.html`))
  const indexFetch = slug ? env.ASSETS.fetch(new Request(`${url.origin}/posts/index.json`)) : null

  const htmlRes = await htmlFetch
  if (!htmlRes.ok) return htmlRes
  const html = await htmlRes.text()

  if (!slug) {
    // ルート・タグ一覧など: サイト全体のOGP
    return htmlWithOgp(html, {
      title: 'Blog',
      description: 'ブログ',
      url: url.href,
      image: null,
      type: 'website',
    })
  }

  // posts/index.json からポストのメタデータを取得（既に並列で開始済み）
  let title = slug, description = ''
  try {
    const indexRes = await indexFetch
    const posts = await indexRes.json()
    const post = posts.find(p => p.slug === slug)
    if (post) {
      title = post.title
      description = [post.date, ...(post.tags ?? [])].filter(Boolean).join(' · ')
    }
  } catch (_) {}

  return htmlWithOgp(html, {
    title,
    description,
    url: url.href,
    image: `${url.origin}/ogp/${slug}`,
    type: isPost ? 'article' : 'website',
  })
}

function htmlWithOgp(html, { title, description, url, image, type = 'article' }) {
  const tags = [
    `<meta name="description" content="${esc(description || title)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:type" content="${esc(type)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    description ? `<meta property="og:description" content="${esc(description)}">` : '',
    image ? `<meta property="og:image" content="${esc(image)}">` : '',
    image ? `<meta property="og:image:type" content="image/png">` : '',
    image ? `<meta property="og:image:width" content="1200">` : '',
    image ? `<meta property="og:image:height" content="630">` : '',
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    image ? `<meta name="twitter:image" content="${esc(image)}">` : '',
  ].filter(Boolean).join('\n  ')

  return new Response(
    html.replace('</head>', `  ${tags}\n</head>`),
    { headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; frame-ancestors 'none'",
    } }
  )
}

function hasExtension(path) {
  return /\.[a-z0-9]+$/i.test(path)
}

function isAssetPath(path) {
  return path.startsWith('/posts/') ||
         path.startsWith('/src/') ||
         path.startsWith('/dev/') ||
         path.startsWith('/ogp/')
}

function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
