import { escapeHtml } from './escape.js'

export function parseInline(text) {
  let result = ''
  let i = 0
  while (i < text.length) {
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1)
      if (end !== -1) { result += `<code>${escapeHtml(text.slice(i + 1, end))}</code>`; i = end + 1; continue }
    }
    if (text.slice(i, i + 3) === '***') {
      const end = text.indexOf('***', i + 3)
      if (end !== -1) { result += `<strong><em>${parseInline(text.slice(i + 3, end))}</em></strong>`; i = end + 3; continue }
      result += '*'; i++; continue  // no closing *** — emit one * literally to avoid ** consuming this position
    }
    if (text.slice(i, i + 2) === '**') {
      const end = text.indexOf('**', i + 2)
      if (end !== -1) { result += `<strong>${parseInline(text.slice(i + 2, end))}</strong>`; i = end + 2; continue }
    }
    if ((text[i] === '*' || text[i] === '_') && text[i + 1] !== text[i]) {
      const char = text[i]
      if (char === '_') {
        // Opening '_' must not be preceded by a word char (snake_case) or followed by whitespace
        const precededByWord = i > 0 && /\w/.test(text[i - 1])
        const followedBySpace = /\s/.test(text[i + 1] ?? '')
        if (precededByWord || followedBySpace) { result += escapeHtml(text[i]); i++; continue }
      }
      const end = text.indexOf(char, i + 1)
      if (end !== -1) {
        // Closing '_' must not be followed by a word char or preceded by whitespace
        const validClose = char !== '_' ||
          (!(/\w/.test(text[end + 1] ?? '')) && !(/\s/.test(text[end - 1])))
        if (validClose) { result += `<em>${parseInline(text.slice(i + 1, end))}</em>`; i = end + 1; continue }
      }
    }
    if (text.slice(i, i + 2) === '![') {
      const bracketEnd = text.indexOf(']', i + 2)
      if (bracketEnd !== -1 && text[bracketEnd + 1] === '(') {
        let d = 1, pe = bracketEnd + 2
        while (pe < text.length) { if (text[pe] === '(') d++; else if (text[pe] === ')') { if (!--d) break }; pe++ }
        if (!d) {
          const src = text.slice(bracketEnd + 2, pe)
          const safeSrc = /^(https?:|data:image\/|[^:]*$)/i.test(src.trim()) ? src : ''
          result += `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(text.slice(i + 2, bracketEnd))}">`;
          i = pe + 1; continue
        }
      }
    }
    if (text[i] === '[') {
      const bracketEnd = text.indexOf(']', i + 1)
      if (bracketEnd !== -1 && text[bracketEnd + 1] === '(') {
        let d = 1, pe = bracketEnd + 2
        while (pe < text.length) { if (text[pe] === '(') d++; else if (text[pe] === ')') { if (!--d) break }; pe++ }
        if (!d) {
          const href = text.slice(bracketEnd + 2, pe)
          const safeHref = /^(https?:|mailto:|[^:]*$)/i.test(href.trim()) ? href : '#'
          result += `<a href="${escapeHtml(safeHref)}">${parseInline(text.slice(i + 1, bracketEnd))}</a>`
          i = pe + 1; continue
        }
      }
    }
    if (text.slice(i, i + 2) === '~~') {
      const end = text.indexOf('~~', i + 2)
      if (end !== -1) { result += `<del>${parseInline(text.slice(i + 2, end))}</del>`; i = end + 2; continue }
    }
    if (text.slice(i, i + 8) === 'https://' || text.slice(i, i + 7) === 'http://') {
      let end = i
      while (end < text.length && !/[\s<>]/.test(text[end])) end++
      const url = text.slice(i, end)
      result += `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`
      i = end; continue
    }
    result += escapeHtml(text[i]); i++
  }
  return result
}
