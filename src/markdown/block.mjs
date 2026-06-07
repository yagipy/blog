import { escapeHtml } from './escape.mjs'
import { parseInline } from './inline.mjs'

function parseListBlock(lines, start, baseIndent) {
  const items = []
  let i = start
  while (i < lines.length) {
    const m = lines[i].match(/^( *)[*-] (.*)/)
    if (!m) break
    const indent = m[1].length
    if (indent < baseIndent) break
    if (indent > baseIndent) break
    i++
    let subHtml = ''
    if (i < lines.length) {
      const nm = lines[i].match(/^( *)[*-]/)
      if (nm && nm[1].length > indent) {
        const [html, newI] = parseListBlock(lines, i, nm[1].length)
        subHtml = html
        i = newI
      }
    }
    items.push(`<li>${parseInline(m[2])}${subHtml}</li>`)
  }
  return [`<ul>${items.join('')}</ul>`, i]
}

export function toHtml(markdown, depth = 0) {
  const lines = markdown.split('\n')
  const out = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const code = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(escapeHtml(lines[i])); i++ }
      if (i < lines.length) i++  // skip closing fence only if found
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : ''
      out.push(`<pre><code${langAttr}>${code.join('\n')}</code></pre>`)
      continue
    }

    const hm = line.match(/^(#{1,3})\s+(.+)/)
    if (hm) {
      const id = hm[2].toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/^-+/, '').replace(/-+$/, '')
      out.push(`<h${hm[1].length}${id ? ` id="${id}"` : ''}>${parseInline(hm[2])}</h${hm[1].length}>`)
      i++; continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { out.push('<hr>'); i++; continue }

    if (line.startsWith('> ')) {
      const ql = []
      while (i < lines.length && lines[i].startsWith('> ')) { ql.push(lines[i].slice(2)); i++ }
      const inner = depth < 20 ? toHtml(ql.join('\n'), depth + 1) : escapeHtml(ql.join('\n'))
      out.push(`<blockquote>${inner}</blockquote>`); continue
    }

    if (/^[*-] /.test(line)) {
      const [html, newI] = parseListBlock(lines, i, 0)
      out.push(html)
      i = newI
      continue
    }

    if (/^\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(`<li>${parseInline(lines[i].replace(/^\d+\. /, ''))}</li>`); i++ }
      out.push(`<ol>${items.join('')}</ol>`); continue
    }

    if (line.trim() === '') { i++; continue }

    if (line.trimStart().startsWith('<')) {
      const hl = []
      while (i < lines.length && lines[i].trim() !== '') { hl.push(lines[i]); i++ }
      out.push(hl.join('\n')); continue
    }

    const pl = []
    while (
      i < lines.length && lines[i].trim() !== '' &&
      !/^#{1,3}\s+\S/.test(lines[i]) && !lines[i].startsWith('```') &&
      !lines[i].startsWith('> ') && !/^\s*[*-] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) && !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !lines[i].trimStart().startsWith('<')
    ) { pl.push(lines[i]); i++ }
    if (pl.length) out.push(`<p>${parseInline(pl.join(' '))}</p>`)
  }

  return out.join('\n')
}
