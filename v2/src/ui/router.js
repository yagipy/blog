import { getRoute } from '../util/url.js'
import { renderIndex, renderTagDetail, renderPost } from './render.js'
import { platform } from '../platform.js'

export function navigate() {
  const route = getRoute()
  if (route.type === 'index' || route.type === 'tags') renderIndex()
  else if (route.type === 'tag')  renderTagDetail(route.tag)
  else if (route.type === 'post')  renderPost(route.slug).catch(e => console.error('Render failed:', e))
}

platform.window.addEventListener('hashchange', navigate)
