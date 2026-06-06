// Worker entry point — merges Pages Functions logic for Workers deployment
// Replaces: functions/[[catchall]].js + functions/ogp/[slug].js

import { parseFont }     from './src/image/font/parser.js'
import { rasterizeText } from './src/image/font/rasterizer.js'
import { encodePng }     from './src/image/png.js'

const W = 1200, H = 630

// ── OGP PNG generation ────────────────────────────────────────────────────────

function fillRect(buf, x, y, w, h, r, g, b, a = 255) {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      const off = (row * W + col) * 4
      buf[off] = r; buf[off+1] = g; buf[off+2] = b; buf[off+3] = a
    }
  }
}

function blit(buf, strip, dx, dy) {
  for (let row = 0; row < strip.height; row++) {
    const dstY = dy + row
    if (dstY < 0 || dstY >= H) continue
    for (let col = 0; col < strip.width; col++) {
      const dstX = dx + col
      if (dstX < 0 || dstX >= W) continue
      const srcOff = (row * strip.width + col) * 4
      if (strip.pixels[srcOff + 3] === 0) continue
      const dstOff = (dstY * W + dstX) * 4
      buf[dstOff]   = strip.pixels[srcOff]
      buf[dstOff+1] = strip.pixels[srcOff+1]
      buf[dstOff+2] = strip.pixels[srcOff+2]
      buf[dstOff+3] = strip.pixels[srcOff+3]
    }
  }
}

function wrapText(font, text, sizePx, maxWidth) {
  const scale = sizePx / font.unitsPerEm
  const lines = []
  let curLine = '', curW = 0
  for (const ch of text) {
    const id  = font.getGlyphId(ch.codePointAt(0))
    const adv = Math.round(font.getAdvanceWidth(id) * scale)
    if (curW + adv > maxWidth && curLine !== '') {
      lines.push(curLine); curLine = ch; curW = adv
    } else {
      curLine += ch; curW += adv
    }
  }
  if (curLine) lines.push(curLine)
  return lines
}

let cachedFont = null

async function handleOgpImage(url, env) {
  const slug = url.pathname.replace(/^\/ogp\//, '').replace(/\.png$/, '')

  if (!cachedFont) {
    cachedFont = (async () => {
      const res = await env.ASSETS.fetch(new Request(`${url.origin}/src/assets/NotoSansJP.ttf`))
      if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`)
      return parseFont(await res.arrayBuffer())
    })().catch(err => { cachedFont = null; throw err })
  }
  const fontPromise = cachedFont

  let title = slug, date = '', postFound = false
  try {
    const res   = await env.ASSETS.fetch(new Request(`${url.origin}/posts/index.json`))
    const posts = await res.json()
    const post  = posts.find(p => p.slug === slug)
    if (post) { title = post.title; date = post.date ?? ''; postFound = true }
  } catch (_) {}

  const font = await fontPromise
  const rgba = new Uint8ClampedArray(W * H * 4).fill(255)
  fillRect(rgba, 0, 0, 10, H, 29, 78, 216)

  const titleSize  = 48
  const marginX    = 80
  const maxTextW   = W - marginX * 2
  const lines      = wrapText(font, String(title), titleSize, maxTextW).slice(0, 2)
  const lineGap    = Math.ceil(titleSize * 1.35)
  const totalTitleH = lines.length * lineGap
  const titleY     = Math.round((H - totalTitleH) / 2) - 20

  for (let i = 0; i < lines.length; i++) {
    blit(rgba, rasterizeText(font, lines[i], titleSize), marginX, titleY + i * lineGap)
  }
  if (date) {
    blit(rgba, rasterizeText(font, date, 24, [107, 114, 128]), marginX, titleY + totalTitleH + 16)
  }
  blit(rgba, rasterizeText(font, 'Blog', 28, [55, 65, 81]), marginX, H - 28 - 30)

  return new Response(encodePng(W, H, rgba), {
    headers: {
      'Content-Type':  'image/png',
      'Cache-Control': postFound ? 'public, max-age=31536000' : 'public, max-age=60',
    },
  })
}

// ── OGP meta injection ────────────────────────────────────────────────────────

function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function htmlWithOgp(html, { title, description, url, image, type = 'article' }) {
  const tags = [
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

async function handlePage(request, url, env) {
  const path = url.pathname
  const isPost     = /^\/[\w-]+$/.test(path) && path !== '/tags'
  const isTagDetail = path.startsWith('/tags/')
  const slug = isPost ? path.slice(1) : (isTagDetail ? path.slice('/tags/'.length) : null)

  const htmlFetch  = env.ASSETS.fetch(new Request(`${url.origin}/index.html`))
  const indexFetch = slug ? env.ASSETS.fetch(new Request(`${url.origin}/posts/index.json`)) : null

  const htmlRes = await htmlFetch
  if (!htmlRes.ok) return htmlRes
  const html = await htmlRes.text()

  if (!slug) {
    return htmlWithOgp(html, { title: 'Blog', description: 'ブログ', url: url.href, image: null, type: 'website' })
  }

  let title = slug, description = ''
  try {
    const indexRes = await indexFetch
    const posts    = await indexRes.json()
    const post     = posts.find(p => p.slug === slug)
    if (post) {
      title       = post.title
      description = [post.date, ...(post.tags ?? [])].filter(Boolean).join(' · ')
    }
  } catch (_) {}

  return htmlWithOgp(html, {
    title, description, url: url.href,
    image: `${url.origin}/ogp/${slug}`,
    type: isPost ? 'article' : 'website',
  })
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/ogp/')) return handleOgpImage(url, env)
    return handlePage(request, url, env)
  }
}
