// OGP PNG generator — Cloudflare Pages Function
// GET /ogp/2024-01-01-hello → 1200×630 PNG for the post

import { parseFont }      from '../../src/image/font/parser.js'
import { rasterizeText }  from '../../src/image/font/rasterizer.js'
import { encodePng }      from '../../src/image/png.js'

const W = 1200, H = 630

// Fill a rectangle in an RGBA buffer
function fillRect(buf, x, y, w, h, r, g, b, a = 255) {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      const off = (row * W + col) * 4
      buf[off] = r; buf[off+1] = g; buf[off+2] = b; buf[off+3] = a
    }
  }
}

// Blit a rasterized text strip into the canvas
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

// Wrap text into lines by pixel width limit
function wrapText(font, text, sizePx, maxWidth) {
  const scale = sizePx / font.unitsPerEm
  const lines = []
  let curLine = ''
  let curW = 0
  for (const ch of text) {
    const id = font.getGlyphId(ch.codePointAt(0))
    const adv = Math.round(font.getAdvanceWidth(id) * scale)
    if (curW + adv > maxWidth && curLine !== '') {
      lines.push(curLine)
      curLine = ch
      curW = adv
    } else {
      curLine += ch
      curW += adv
    }
  }
  if (curLine) lines.push(curLine)
  return lines
}

// Cache the Promise itself so concurrent cold-start requests share one fetch+parse
let cachedFont = null

export async function onRequest({ request, env }) {
  const url  = new URL(request.url)
  const slug = url.pathname.replace(/^\/ogp\//, '').replace(/\.png$/, '')

  // Kick off font loading immediately — runs concurrently with posts index fetch below
  if (!cachedFont) {
    cachedFont = (async () => {
      const res = await env.ASSETS.fetch(new Request(`${url.origin}/src/assets/NotoSansJP.ttf`))
      if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`)
      return parseFont(await res.arrayBuffer())
    })().catch(err => { cachedFont = null; throw err })
  }
  // Capture the Promise now — the posts-fetch await below could let .catch() null the module variable
  const fontPromise = cachedFont

  let title = slug, date = '', postFound = false
  try {
    const res   = await env.ASSETS.fetch(new Request(`${url.origin}/posts/index.json`))
    const posts = await res.json()
    const post  = posts.find(p => p.slug === slug)
    if (post) { title = post.title; date = post.date ?? ''; postFound = true }
  } catch (_) {}

  const font = await fontPromise

  // Canvas — fill(255) initialises all pixels to opaque white in one bulk op
  const rgba = new Uint8ClampedArray(W * H * 4).fill(255)
  fillRect(rgba, 0, 0, 10, H, 29, 78, 216)    // blue left border (#1d4ed8)

  // Title — wrap to max 2 lines at 48px
  const titleSize = 48
  const marginX   = 80
  const maxTextW  = W - marginX * 2
  const lines     = wrapText(font, String(title), titleSize, maxTextW).slice(0, 2)
  const lineGap   = Math.ceil(titleSize * 1.35)
  const totalTitleH = lines.length * lineGap
  const titleY    = Math.round((H - totalTitleH) / 2) - 20

  for (let i = 0; i < lines.length; i++) {
    const strip = rasterizeText(font, lines[i], titleSize)
    blit(rgba, strip, marginX, titleY + i * lineGap)
  }

  // Date — 24px, gray (#6b7280)
  if (date) {
    const dateStrip = rasterizeText(font, date, 24, [107, 114, 128])
    blit(rgba, dateStrip, marginX, titleY + totalTitleH + 16)
  }

  // "Blog" label — bottom left
  const blogStrip = rasterizeText(font, 'Blog', 28, [55, 65, 81])
  blit(rgba, blogStrip, marginX, H - 28 - 30)

  const png = encodePng(W, H, rgba)

  return new Response(png, {
    headers: {
      'Content-Type':  'image/png',
      // Don't cache long when post metadata wasn't found (title fell back to raw slug)
      'Cache-Control': postFound ? 'public, max-age=31536000' : 'public, max-age=60',
    },
  })
}
