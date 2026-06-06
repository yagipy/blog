import { platform } from '../platform.js'

export async function initHeader() {
  const header = platform.document.querySelector('header')
  if (!header) return

  const titleLink = platform.document.createElement('a')
  titleLink.href = '/'
  titleLink.textContent = 'yagipy blog'

  const githubLink = platform.document.createElement('a')
  githubLink.href = 'https://github.com/yagipy'
  githubLink.setAttribute('aria-label', 'GitHub')
  githubLink.className = 'github-link'

  try {
    const res = await platform.fetch('./src/assets/github.svg')
    if (res.ok) githubLink.innerHTML = await res.text()
  } catch (_) {}

  header.replaceChildren(titleLink, githubLink)
}
