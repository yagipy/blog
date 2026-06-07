import { platform } from '../platform.mjs'
import { isLocal } from './env.mjs'

// ルートを解析して { type, slug?, tag? } を返す
// type: 'index' | 'tags' | 'tag' | 'post'
export const linkHref = path => isLocal ? `#${path}` : `/${path}`
const SLUG_RE = /^[\w](?:[\w-]*[\w])?$/

export function getRoute() {
  const raw = isLocal
    ? platform.location.hash.slice(1)
    : platform.location.pathname.replace(/^\/|\/$/g, '')
  if (!raw) return { type: 'index' }
  if (raw === 'tags') return { type: 'tags' }
  if (raw.startsWith('tags/')) {
    try { return { type: 'tag', tag: decodeURIComponent(raw.slice(5)) } } catch (_) {}
    return { type: 'index' }
  }
  if (SLUG_RE.test(raw)) return { type: 'post', slug: raw }
  return { type: 'index' }
}
