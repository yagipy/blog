import { getRoute } from '../util/url.mjs'
import { renderIndex, renderTagDetail, renderPost } from './render.mjs'
import { platform } from '../platform.mjs'
import { isLocal } from '../util/env.mjs'

export function navigate() {
  const route = getRoute()
  if (route.type === 'index' || route.type === 'tags') renderIndex()
  else if (route.type === 'tag')  renderTagDetail(route.tag)
  else if (route.type === 'post')  renderPost(route.slug).catch(e => console.error('Render failed:', e))
}

if (isLocal) {
  platform.window.addEventListener('hashchange', navigate)
} else {
  platform.window.addEventListener('popstate', navigate)
  platform.document.addEventListener('click', e => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
    if (!(e.target instanceof Element)) return
    const a = e.target.closest('a')
    if (!a || (a.target && a.target.toLowerCase() !== '_self') || a.hasAttribute('download')) return
    const href = a.getAttribute('href')
    if (!href || href.startsWith('#') || /^[a-z][a-z\d+\-.]*:/i.test(href) || href.startsWith('//')) return
    e.preventDefault()
    platform.history.pushState(null, '', href)
    navigate()
  })
}
