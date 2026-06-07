import { platform } from '../platform.mjs'
import { state } from './state.mjs'
import { getRoute } from './url.mjs'
import { renderIndex, renderTagDetail } from '../ui/render.mjs'

export async function fetchIndex() {
  try {
    const res = await platform.fetch('posts/index.json')
    if (!res.ok) return false
    const parsed = JSON.parse(await res.text())
    if (!Array.isArray(parsed)) return false
    state.postsList = parsed
    const route = getRoute()
    if (route.type === 'index' || route.type === 'tags') { renderIndex(); return true }
    if (route.type === 'tag') { renderTagDetail(route.tag); return true }
    return false
  } catch (_) { return false }
}
