import { platform } from '../platform.js'

// ルートを解析して { type, slug?, tag? } を返す
// type: 'index' | 'tags' | 'tag' | 'post'
export function getRoute() {
  const raw = platform.location.hash.slice(1) || platform.location.pathname.replace(/^\//, '').replace(/\/$/, '')
  if (!raw) return { type: 'index' }
  if (raw === 'tags') return { type: 'tags' }
  if (raw.startsWith('tags/')) {
    try { return { type: 'tag', tag: decodeURIComponent(raw.slice(5)) } } catch (_) {}
    return { type: 'index' }
  }
  if (/^[\w-]+$/.test(raw)) return { type: 'post', slug: raw }
  return { type: 'index' }
}
