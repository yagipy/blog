// ローカル開発時のみ読み込まれる型チェック・Lint・Format・OGP プレビューパネル

const FILES = [
  '/src/app.mjs',
  '/src/ui/render.mjs',
  '/src/ui/router.mjs',
  '/src/ui/header.mjs',
  '/src/util/poll.mjs',
  '/src/util/url.mjs',
  '/src/util/state.mjs',
  '/src/optimization/bayes-client.mjs',
  '/src/optimization/beacon.mjs',
  '/src/optimization/bayes.mjs',
  '/src/markdown/escape.mjs',
  '/src/markdown/inline.mjs',
  '/src/markdown/block.mjs',
]

// ── スタイル ────────────────────────────────────────────────────────────────

const STYLE = `
#dev-panel-btn {
  position: fixed; bottom: 1rem; right: 1rem; z-index: 9999;
  background: #1e293b; color: #94a3b8; border: none; border-radius: 6px;
  padding: 0.4rem 0.75rem; font-size: 0.75rem; font-family: monospace;
  cursor: pointer; opacity: 0.7;
}
#dev-panel-btn:hover { opacity: 1; }
#dev-panel-btn.open { background: #334155; color: #e2e8f0; opacity: 1; }
#dev-panel {
  position: fixed; bottom: 2.5rem; right: 1rem; z-index: 9998;
  width: 480px; max-height: 520px;
  background: #0f172a; color: #e2e8f0; border-radius: 8px;
  font-size: 0.75rem; font-family: monospace;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  display: none; flex-direction: column;
  overflow: hidden;
}
#dev-panel.open { display: flex; }
#dev-panel header {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.75rem; background: #1e293b;
  border-bottom: 1px solid #334155; flex-shrink: 0;
}
#dev-panel header span { flex: 1; color: #94a3b8; }
.dev-tab {
  padding: 0.25rem 0.6rem; border: none; border-radius: 4px;
  background: transparent; color: #64748b; cursor: pointer; font-size: 0.7rem;
}
.dev-tab.active { background: #334155; color: #e2e8f0; }
.dev-run {
  padding: 0.25rem 0.6rem; border: none; border-radius: 4px;
  background: #2563eb; color: #fff; cursor: pointer; font-size: 0.7rem;
}
.dev-run:disabled { background: #334155; color: #64748b; cursor: default; }
#dev-panel-body { overflow-y: auto; flex: 1; padding: 0.5rem 0; }
.dev-file { color: #38bdf8; padding: 0.3rem 0.75rem 0.1rem; }
.dev-item {
  padding: 0.15rem 0.75rem 0.15rem 1.5rem;
  display: grid; grid-template-columns: 3.5rem 1fr;
  gap: 0.5rem; line-height: 1.4;
}
.dev-item .loc { color: #64748b; }
.dev-item.error .msg { color: #f87171; }
.dev-item.warn  .msg { color: #fb923c; }
.dev-item.info  .msg { color: #a3e635; }
.dev-item.fmt   .msg { color: #34d399; }
.dev-empty { padding: 0.5rem 0.75rem; color: #475569; }
#dev-ogp-form {
  padding: 0.5rem 0.75rem; display: flex; gap: 0.5rem; border-bottom: 1px solid #1e293b;
}
#dev-ogp-slug {
  flex: 1; background: #1e293b; border: 1px solid #334155; border-radius: 4px;
  color: #e2e8f0; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-family: monospace;
  outline: none;
}
#dev-ogp-slug:focus { border-color: #2563eb; }
#dev-ogp-result { padding: 0.5rem 0.75rem; }
#dev-ogp-result img { width: 100%; border-radius: 4px; display: block; }
`

// ── DOM 構築 ────────────────────────────────────────────────────────────────

function buildPanel() {
  const style = document.createElement('style')
  style.textContent = STYLE
  document.head.appendChild(style)

  const btn = document.createElement('button')
  btn.id = 'dev-panel-btn'
  btn.textContent = 'DEV'

  const panel = document.createElement('div')
  panel.id = 'dev-panel'
  panel.innerHTML = `
  <header>
    <span>inspector</span>
    <button class="dev-tab active" data-mode="check">型</button>
    <button class="dev-tab" data-mode="lint">Lint</button>
    <button class="dev-tab" data-mode="format">Format</button>
    <button class="dev-tab" data-mode="ogp">OGP</button>
    <button class="dev-run">▶ Run</button>
  </header>
  <div id="dev-panel-body"><p class="dev-empty">▶ Run を押すとチェックが始まります</p></div>
  `

  document.body.append(btn, panel)
  return { btn, panel }
}

// ── OGP 画像生成 ─────────────────────────────────────────────────────────────

const OGP_W = 1200, OGP_H = 630

function ogpFillRect(buf, x, y, w, h, r, g, b) {
  for (let row = y; row < y + h; row++)
    for (let col = x; col < x + w; col++) {
      const off = (row * OGP_W + col) * 4
      buf[off] = r; buf[off+1] = g; buf[off+2] = b; buf[off+3] = 255
    }
}

function ogpBlit(buf, strip, dx, dy) {
  for (let row = 0; row < strip.height; row++) {
    const dstY = dy + row
    if (dstY < 0 || dstY >= OGP_H) continue
    for (let col = 0; col < strip.width; col++) {
      const dstX = dx + col
      if (dstX < 0 || dstX >= OGP_W) continue
      const srcOff = (row * strip.width + col) * 4
      if (strip.pixels[srcOff + 3] === 0) continue
      const dstOff = (dstY * OGP_W + dstX) * 4
      buf[dstOff]   = strip.pixels[srcOff]
      buf[dstOff+1] = strip.pixels[srcOff+1]
      buf[dstOff+2] = strip.pixels[srcOff+2]
      buf[dstOff+3] = strip.pixels[srcOff+3]
    }
  }
}

function ogpBlitBold(buf, strip, dx, dy) {
  ogpBlit(buf, strip, dx,     dy)
  ogpBlit(buf, strip, dx + 1, dy)
  ogpBlit(buf, strip, dx + 2, dy)
}
function ogpBlitSemi(buf, strip, dx, dy) {
  ogpBlit(buf, strip, dx,     dy)
  ogpBlit(buf, strip, dx + 1, dy)
}

function ogpWrapText(font, text, sizePx, maxWidth) {
  const scale = sizePx / font.unitsPerEm
  const lines = []; let curLine = '', curW = 0
  for (const ch of text) {
    const id  = font.getGlyphId(ch.codePointAt(0))
    const adv = Math.round(font.getAdvanceWidth(id) * scale)
    if (curW + adv > maxWidth && curLine !== '') { lines.push(curLine); curLine = ch; curW = adv }
    else { curLine += ch; curW += adv }
  }
  if (curLine) lines.push(curLine)
  return lines
}

let ogpModules = null

async function runOgp(slug, resultEl) {
  resultEl.innerHTML = '<p class="dev-empty">生成中…</p>'
  try {
    if (!ogpModules) {
      const [{ parseFont }, { rasterizeText }, { encodePng }] = await Promise.all([
        import('/src/image/font/parser.mjs'),
        import('/src/image/font/rasterizer.mjs'),
        import('/src/image/png.mjs'),
      ])
      ogpModules = { parseFont, rasterizeText, encodePng }
    }
    const { parseFont, rasterizeText, encodePng } = ogpModules

    const [fontBuf, posts] = await Promise.all([
      fetch('/src/assets/NotoSansJP.ttf').then(r => r.arrayBuffer()),
      fetch('/posts/index.json').then(r => r.json()),
    ])
    const font  = parseFont(fontBuf)
    const post  = posts.find(p => p.slug === slug)
    const title = post?.title ?? slug
    const date  = post?.date  ?? ''
    const tags  = post?.tags  ?? []

    const rgba = new Uint8ClampedArray(OGP_W * OGP_H * 4).fill(255)
    const borderW = 20
    ogpFillRect(rgba, 0, 0, borderW, OGP_H, 29, 78, 216)

    const titleSize   = 48, marginX = borderW + 70, maxTextW = OGP_W - marginX * 2 - 2
    const lines       = ogpWrapText(font, String(title), titleSize, maxTextW).slice(0, 2)
    const lineGap     = Math.ceil(titleSize * 1.35)
    const totalTitleH = lines.length * lineGap

    const tagText = tags.length > 0 ? tags.map(t => `#${t}`).join('  ') : ''
    const contentH = totalTitleH + (tagText ? 20 + 22 : 0)

    const footerY = OGP_H - 28 - 60
    const titleY  = Math.round((40 + footerY - contentH) / 2)

    for (let i = 0; i < lines.length; i++)
      ogpBlitBold(rgba, rasterizeText(font, lines[i], titleSize), marginX, titleY + i * lineGap)

    if (tagText)
      ogpBlitSemi(rgba, rasterizeText(font, tagText, 22, [99, 102, 241]), marginX, titleY + totalTitleH + 20)

    ogpBlitSemi(rgba, rasterizeText(font, 'yagipy blog', 28, [55, 65, 81]), marginX, footerY)

    const png  = encodePng(OGP_W, OGP_H, rgba)
    const blob = new Blob([png], { type: 'image/png' })
    const url  = URL.createObjectURL(blob)
    const img  = document.createElement('img')
    img.src = url
    img.alt = `OGP: ${slug}`
    img.addEventListener('load', () => URL.revokeObjectURL(url), { once: true })
    resultEl.innerHTML = ''
    resultEl.appendChild(img)
  } catch (e) {
    resultEl.innerHTML = `<p class="dev-empty" style="color:#f87171">${e.message}</p>`
  }
}

// ── Inspector Worker との通信 ────────────────────────────────────────────────

function runChecks(worker, mode, setBody) {
  setBody('<p class="dev-empty">チェック中…</p>')

  Promise.all(FILES.map(async path => {
    const res = await fetch(path, { cache: 'no-store' })
    if (!res.ok) return null
    return { path, source: await res.text() }
  })).then(files => {
    const results = []
    let pending = 0

    const done = () => {
      if (--pending > 0) return
      renderResults(results, mode, setBody)
    }

    for (const file of files.filter(Boolean)) {
      pending++
      const id = Math.random()
      const handler = e => {
        if (e.data._id !== id) return
        worker.removeEventListener('message', handler)
        results.push({ path: file.path, data: e.data, source: file.source })
        done()
      }
      worker.addEventListener('message', handler)
      worker.postMessage({ type: mode, source: file.source, _id: id })
    }

    if (pending === 0) setBody('<p class="dev-empty">ファイルなし</p>')
  })
}

// ── 結果レンダリング ─────────────────────────────────────────────────────────

function renderResults(results, mode, setBody) {
  let html = ''
  let total = 0

  for (const { path, data, source } of results) {
    const items = buildItems(data, mode, source)
    if (items.length === 0) continue
    total += items.length
    html += `<div class="dev-file">${path}</div>`
    html += items.join('')
  }

  setBody(html || `<p class="dev-empty">✓ 問題なし</p>`)

  const runBtn = document.querySelector('.dev-run')
  const label = mode === 'check' ? '型エラー' : mode === 'lint' ? '警告' : '変更'
  runBtn.textContent = total ? `▶ ${total} ${label}` : '▶ Run'
}

function buildItems(data, mode, source) {
  if (mode === 'check') {
    return (data.errors ?? []).map(e =>
      `<div class="dev-item error"><span class="loc">L${e.line}</span><span class="msg">${e.message}</span></div>`
    )
  }
  if (mode === 'lint') {
    return (data.warnings ?? []).map(w =>
      `<div class="dev-item warn"><span class="loc">L${w.line} [${w.rule}]</span><span class="msg">${w.message}</span></div>`
    )
  }
  if (mode === 'format') {
    return (data.changes ?? []).map(c =>
      `<div class="dev-item fmt"><span class="loc">–</span><span class="msg">${c}</span></div>`
    )
  }
  return []
}

// ── 初期化 ───────────────────────────────────────────────────────────────────

export function initDevPanel() {
  const worker = new Worker('/src/devtools/inspector/worker.mjs', { type: 'module' })
  const { btn, panel } = buildPanel()

  let mode = 'check'
  const body    = panel.querySelector('#dev-panel-body')
  const runBtn  = panel.querySelector('.dev-run')
  const setBody = html => { body.innerHTML = html }

  const LS_KEY = 'dev-panel-open'

  function togglePanel() {
    const isOpen = panel.classList.toggle('open')
    btn.classList.toggle('open', isOpen)
    btn.textContent = 'DEV'
    localStorage.setItem(LS_KEY, isOpen ? '1' : '0')
  }

  if (localStorage.getItem(LS_KEY) === '1') {
    panel.classList.add('open')
    btn.classList.add('open')
  }

  btn.addEventListener('click', togglePanel)

  // OGP タブ用 UI（slug 入力フォームを body 先頭に保持）
  function showOgpForm() {
    const currentSlug = location.hash.slice(1) || ''
    body.innerHTML = `
      <div id="dev-ogp-form">
        <input id="dev-ogp-slug" placeholder="slug を入力…" value="${currentSlug}">
      </div>
      <div id="dev-ogp-result"><p class="dev-empty">▶ Run で OGP 画像を生成します</p></div>
    `
    runBtn.textContent = '▶ Run'
  }

  // タブ切り替え
  panel.querySelectorAll('.dev-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.dev-tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      mode = tab.dataset.mode
      if (mode === 'ogp') {
        showOgpForm()
      } else {
        setBody('<p class="dev-empty">▶ Run を押してください</p>')
        runBtn.textContent = '▶ Run'
      }
    })
  })

  // 実行
  runBtn.addEventListener('click', e => {
    if (mode === 'ogp') {
      const slug = body.querySelector('#dev-ogp-slug')?.value.trim()
      if (!slug) return
      const resultEl = body.querySelector('#dev-ogp-result')
      e.target.disabled = true
      e.target.textContent = '生成中…'
      runOgp(slug, resultEl).finally(() => {
        e.target.disabled = false
        e.target.textContent = '▶ Run'
      })
    } else {
      e.target.disabled = true
      e.target.textContent = '実行中…'
      runChecks(worker, mode, html => {
        setBody(html)
        e.target.disabled = false
      })
    }
  })
}
