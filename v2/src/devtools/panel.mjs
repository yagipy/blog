// ローカル開発時のみ読み込まれる型チェック・Lint・Format パネル

const FILES = [
  '/src/app.js',
  '/src/ui/render.js',
  '/src/ui/router.js',
  '/src/ui/header.js',
  '/src/util/poll.js',
  '/src/util/url.js',
  '/src/util/state.js',
  '/src/optimization/bayes-client.js',
  '/src/optimization/beacon.js',
  '/src/optimization/bayes.js',
  '/src/markdown/escape.js',
  '/src/markdown/inline.js',
  '/src/markdown/block.js',
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
#dev-panel {
  position: fixed; bottom: 2.5rem; right: 1rem; z-index: 9998;
  width: 480px; max-height: 400px;
  background: #0f172a; color: #e2e8f0; border-radius: 8px;
  font-size: 0.75rem; font-family: monospace;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  display: flex; flex-direction: column;
  overflow: hidden;
}
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
  panel.hidden = true
  panel.innerHTML = `
  <header>
  <span>inspector</span>
  <button class="dev-tab active" data-mode="check">型</button>
  <button class="dev-tab" data-mode="lint">Lint</button>
  <button class="dev-tab" data-mode="format">Format</button>
  <button class="dev-run">▶ Run</button>
  </header>
  <div id="dev-panel-body"><p class="dev-empty">▶ Run を押すとチェックが始まります</p></div>
  `

  document.body.append(btn, panel)
  return { btn, panel }
}

// ── Worker との通信 ──────────────────────────────────────────────────────────

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
  const worker = new Worker('/dev/inspector/worker.mjs', { type: 'module' })
  const { btn, panel } = buildPanel()

  let mode = 'check'
  const body = panel.querySelector('#dev-panel-body')
  const setBody = html => { body.innerHTML = html }

  // パネル開閉
  btn.addEventListener('click', () => { panel.hidden = !panel.hidden })

  // タブ切り替え
  panel.querySelectorAll('.dev-tab').forEach(tab => {
      tab.addEventListener('click', () => {
          panel.querySelectorAll('.dev-tab').forEach(t => t.classList.remove('active'))
          tab.classList.add('active')
          mode = tab.dataset.mode
          setBody('<p class="dev-empty">▶ Run を押してください</p>')
          panel.querySelector('.dev-run').textContent = '▶ Run'
      })
  })

  // 実行
  panel.querySelector('.dev-run').addEventListener('click', e => {
      e.target.disabled = true
      e.target.textContent = '実行中…'
      runChecks(worker, mode, html => {
          setBody(html)
          e.target.disabled = false
      })
  })
}
