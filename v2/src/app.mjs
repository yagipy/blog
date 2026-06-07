import { navigate }   from './ui/router.mjs'
import { fetchIndex } from './util/poll.mjs'
import { initHeader } from './ui/header.mjs'
import { platform }   from './platform.mjs'
import { isLocal }    from './util/env.mjs'

const wrapper = platform.document.createElement('div')
wrapper.id = 'wrapper'
const header = platform.document.createElement('header')
const main = platform.document.createElement('main')
wrapper.append(header, main)
platform.document.body.appendChild(wrapper)

platform.navigator.serviceWorker?.register('./sw.mjs', { type: 'module' }).catch(() => {})

if (isLocal) {
  import('./devtools/panel.mjs').then(m => m.initDevPanel())
}

async function boot() {
  const [, rendered] = await Promise.all([initHeader(), fetchIndex()])
  if (!rendered) navigate()
}

boot().catch(e => console.error('Boot failed:', e))
