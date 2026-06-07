// OGP PNG generator — Cloudflare Pages Function
// GET /ogp/2024-01-01-hello → 1200×630 PNG for the post

import { parseFont }      from '../../src/image/font/parser.mjs'
import { rasterizeText }  from '../../src/image/font/rasterizer.mjs'
import { encodePng }      from '../../src/image/png.mjs'

const W = 1200, H = 630

function fillRect(buf, x, y, w, h, r, g, b) {
  for (let row = y; row < y + h; row++)
    for (let col = x; col < x + w; col++) {
      const off = (row * W + col) * 4
      buf[off] = r; buf[off+1] = g; buf[off+2] = b; buf[off+3] = 255
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

// Synthetic bold: 3 passes (+2px) for title, 2 passes (+1px) for secondary text
function blitBold(buf, strip, dx, dy) {
  blit(buf, strip, dx,     dy)
  blit(buf, strip, dx + 1, dy)
  blit(buf, strip, dx + 2, dy)
}
function blitSemi(buf, strip, dx, dy) {
  blit(buf, strip, dx,     dy)
  blit(buf, strip, dx + 1, dy)
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

// Cache the Promise itself so concurrent cold-start requests share one fetch+parse
let cachedFont = null

export async function onRequest({ request, env }) {
  const url  = new URL(request.url)
  const slug = url.pathname.replace(/^\/ogp\//, '').replace(/\.png$/, '')

  if (!cachedFont) {
    cachedFont = (async () => {
      const res = await env.ASSETS.fetch(new Request(`${url.origin}/src/assets/NotoSansJP.ttf`))
      if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`)
      return parseFont(await res.arrayBuffer())
    })().catch(err => { cachedFont = null; throw err })
  }
  const fontPromise = cachedFont

  let title = slug, date = '', tags = [], postFound = false
  try {
    const res   = await env.ASSETS.fetch(new Request(`${url.origin}/posts/index.json`))
    const posts = await res.json()
    const post  = posts.find(p => p.slug === slug)
    if (post) { title = post.title; date = post.date ?? ''; tags = post.tags ?? []; postFound = true }
  } catch (_) {}

  const font = await fontPromise

  const rgba = new Uint8ClampedArray(W * H * 4).fill(255)
  const borderW = 20
  fillRect(rgba, 0, 0, borderW, H, 29, 78, 216)

  const titleSize   = 48
  const marginX     = borderW + 70
  const maxTextW    = W - marginX * 2 - 2  // -2 for bold overhang
  const lines       = wrapText(font, String(title), titleSize, maxTextW).slice(0, 2)
  const lineGap     = Math.ceil(titleSize * 1.35)
  const totalTitleH = lines.length * lineGap

  const tagText = tags.length > 0 ? tags.map(t => `#${t}`).join('  ') : ''
  const contentH = totalTitleH + (tagText ? 20 + 22 : 0)

  const footerY = H - 28 - 60
  const titleY  = Math.round((40 + footerY - contentH) / 2)

  for (let i = 0; i < lines.length; i++) {
    const strip = rasterizeText(font, lines[i], titleSize)
    blitBold(rgba, strip, marginX, titleY + i * lineGap)
  }

  if (tagText) {
    blitSemi(rgba, rasterizeText(font, tagText, 22, [99, 102, 241]), marginX, titleY + totalTitleH + 20)
  }

  blitSemi(rgba, rasterizeText(font, 'yagipy blog', 28, [55, 65, 81]), marginX, footerY)

  const png = encodePng(W, H, rgba)

  return new Response(png, {
    headers: {
      'Content-Type':  'image/png',
      'Cache-Control': postFound ? 'public, max-age=31536000' : 'public, max-age=60',
    },
  })
}
