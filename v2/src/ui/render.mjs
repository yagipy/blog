import { toHtml } from 'markdown'
import { platform } from '../platform.mjs'
import { state } from '../util/state.mjs'
import { getRoute, linkHref } from '../util/url.mjs'

// tags は文字列配列（index.json の "tags": ["技術", "雑記"] 形式）
function parseTags(tags) {
  if (!Array.isArray(tags)) return []
  return tags.filter(Boolean)
}

// タグリンク要素を生成
function createTagLink(tag) {
  const a = platform.document.createElement('a')
  a.href = linkHref(`tags/${encodeURIComponent(tag)}`)
  a.className = 'tags'
  a.textContent = tag
  return a
}

// 記事リスト項目を生成
function createPostItem(p) {
  const li = platform.document.createElement('li')

  if (p.date) {
    const time = platform.document.createElement('time')
    time.setAttribute('datetime', p.date)
    time.textContent = p.date
    li.append(time, ' ')
  }

  const a = platform.document.createElement('a')
  a.href = linkHref(p.slug)
  a.className = 'post-link'
  a.textContent = p.title
  li.appendChild(a)

  parseTags(p.tags).forEach(tag => {
      li.append(' ', createTagLink(tag))
  })

  return li
}

// ── 記事一覧 ──────────────────────────────────────────────────────────────────

export function renderIndex() {
  const main = platform.document.querySelector('main')
  if (!main) return

  if (state.postsList.length === 0) {
    const p = platform.document.createElement('p')
    p.textContent = '記事がありません。'
    main.replaceChildren(p)
    return
  }

  const ul = platform.document.createElement('ul')
  ul.className = 'post-list'
  state.postsList.forEach(p => ul.appendChild(createPostItem(p)))

  // タグ集計
  const counts = Object.create(null)
  state.postsList.forEach(p => {
      parseTags(p.tags).forEach(tag => { counts[tag] = (counts[tag] ?? 0) + 1 })
  })
  const tagEntries = Object.entries(counts).sort((a, b) => b[1] - a[1])

  main.replaceChildren(ul)

  if (tagEntries.length > 0) {
    const section = platform.document.createElement('section')
    section.className = 'tag-section'

    const h2 = platform.document.createElement('h2')
    h2.className = 'page-title'
    h2.textContent = 'タグ'
    section.appendChild(h2)

    const tagUl = platform.document.createElement('ul')
    tagUl.className = 'tag-list'
    tagEntries.forEach(([tag, count]) => {
        const li = platform.document.createElement('li')
        const span = platform.document.createElement('span')
        span.className = 'tag-count'
        span.textContent = count
        li.append(createTagLink(tag), ' ', span)
        tagUl.appendChild(li)
    })
    section.appendChild(tagUl)
    main.appendChild(section)
  }
}

// ── タグ詳細 ──────────────────────────────────────────────────────────────────

export function renderTagDetail(tag) {
  const main = platform.document.querySelector('main')
  if (!main) return

  const posts = state.postsList.filter(p => parseTags(p.tags).includes(tag))

  if (posts.length === 0) {
    const p = platform.document.createElement('p')
    p.textContent = `「${tag}」の記事はありません。`
    main.replaceChildren(p)
    return
  }

  const h2 = platform.document.createElement('h2')
  h2.className = 'page-title'
  h2.textContent = tag

  const ul = platform.document.createElement('ul')
  ul.className = 'post-list'
  posts.forEach(p => ul.appendChild(createPostItem(p)))

  main.replaceChildren(h2, ul)
}

// ── 記事本文 ──────────────────────────────────────────────────────────────────

export async function renderPost(slug) {
  const main = platform.document.querySelector('main')
  if (!main) return

  const entry = state.postsList.find(p => p.slug === slug)
  const path = entry ? entry.path : `posts/${slug}.md`

  const loading = platform.document.createElement('p')
  loading.textContent = '読み込み中…'
  main.replaceChildren(loading)

  let text
  try {
    const res = await platform.fetch(path)
    if (!res.ok) throw new Error(`${res.status}`)
    text = await res.text()
  } catch (err) {
    const route = getRoute()
    if (route.type !== 'post' || route.slug !== slug) return
    const p = platform.document.createElement('p')
    p.textContent = `記事を取得できませんでした (${err.message})`
    main.replaceChildren(p)
    return
  }

  const route = getRoute()
  if (route.type !== 'post' || route.slug !== slug) return

  const body = text
  const title = entry?.title ?? slug
  const date  = entry?.date  ?? ''

  // 記事要素を DOM API で構築
  const article = platform.document.createElement('article')

  const articleHeader = platform.document.createElement('header')

  const h1 = platform.document.createElement('h1')
  h1.textContent = title
  articleHeader.appendChild(h1)

  const metaDiv = platform.document.createElement('div')
  metaDiv.className = 'meta'
  if (date) {
    const time = platform.document.createElement('time')
    time.setAttribute('datetime', date)
    time.textContent = date
    metaDiv.appendChild(time)
  }
  parseTags(entry?.tags).forEach(tag => {
      metaDiv.append(' ', createTagLink(tag))
  })
  articleHeader.appendChild(metaDiv)
  article.appendChild(articleHeader)

  // 本文のみ innerHTML（Markdown パーサーが生成した信頼済み HTML）
  const postBody = platform.document.createElement('div')
  postBody.className = 'post-body'
  postBody.innerHTML = toHtml(body)
  article.appendChild(postBody)

  main.replaceChildren(article)
}
