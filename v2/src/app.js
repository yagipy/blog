import { navigate }   from './ui/router.js'
import { fetchIndex } from './util/poll.js'
import { initHeader } from './ui/header.js'
import { platform }   from './platform.js'

const wrapper = platform.document.createElement('div')
wrapper.id = 'wrapper'
const header = platform.document.createElement('header')
const main = platform.document.createElement('main')
wrapper.append(header, main)
platform.document.body.appendChild(wrapper)

platform.navigator.serviceWorker?.register('./sw.js').catch(() => {})

if (platform.location.hostname === 'localhost' || platform.location.hostname === '127.0.0.1') {
  import('./devtools/panel.mjs').then(m => m.initDevPanel())
}

async function boot() {
  const [, rendered] = await Promise.all([initHeader(), fetchIndex()])
  if (!rendered) navigate()
}

boot().catch(e => console.error('Boot failed:', e))
