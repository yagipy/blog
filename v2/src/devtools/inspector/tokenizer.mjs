// トークン種別
export const T = {
  JSDOC:    'JSDOC',    // /** ... */
  STRING:   'STRING',   // 'x' "x"
  TEMPLATE: 'TEMPLATE', // `x`
  REGEX:    'REGEX',    // /pattern/flags
  NUMBER:   'NUMBER',   // 42
  KW:       'KW',       // let const function ...
  IDENT:    'IDENT',    // 識別子
  OP:       'OP',       // => === !== ... (複数文字の演算子)
  PUNC:     'PUNC',     // ( ) { } [ ] , ; .
}

// 直前のトークンから正規表現リテラルが来うるか判定
function isRegexStart(tokens) {
  if (tokens.length === 0) return true
  const prev = tokens[tokens.length - 1]
  if (prev.type === T.OP) return true
  if (prev.type === T.PUNC && '=([{,;!&|?:~^'.includes(prev.value)) return true
  if (prev.type === T.KW) {
    const literal = new Set(['this','super','null','undefined','true','false'])
    return !literal.has(prev.value)
  }
  return false
}

const KEYWORDS = new Set([
  'let','const','var','function','return','if','else','for','while','do',
  'new','typeof','instanceof','null','undefined','true','false',
  'async','await','class','extends','import','export','default',
  'this','try','catch','finally','throw','of','in','switch','case',
  'break','continue','static','get','set','yield','delete','void',
])

const MULTI_OPS = [
  '...','===','!==','**=','>>=','<<=','&&=','||=','??=',
  '=>','??','?.','**','++','--','&&','||',
  '+=','-=','*=','/=','%=','==','!=','<=','>=','<<','>>',
]

export function tokenize(src) {
  const tokens = []
  let i = 0
  let line = 1

  while (i < src.length) {
    const ch = src[i]

    // 改行
    if (ch === '\r') { if (src[i + 1] === '\n') i++; line++; i++; continue }
    if (ch === '\n') { line++; i++; continue }

    // 空白
    if (ch === ' ' || ch === '\t') { i++; continue }

    // JSDoc コメント /** ... */
    if (src.slice(i, i + 3) === '/**') {
      const end = src.indexOf('*/', i + 3)
      if (end !== -1) {
        const raw = src.slice(i, end + 2)
        tokens.push({ type: T.JSDOC, value: raw, line })
        line += raw.split('\n').length - 1
        i = end + 2
        continue
      }
    }

    // ブロックコメント /* ... */
    if (src.slice(i, i + 2) === '/*') {
      const end = src.indexOf('*/', i + 2)
      if (end !== -1) {
        line += src.slice(i, end + 2).split('\n').length - 1
        i = end + 2
      } else {
        i = src.length
      }
      continue
    }

    // 行コメント // ...
    if (src.slice(i, i + 2) === '//') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }

    // 正規表現リテラル /pattern/flags
    if (ch === '/' && isRegexStart(tokens)) {
      let j = i + 1
      let inClass = false
      while (j < src.length && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === '[') { inClass = true; j++; continue }
        if (src[j] === ']') { inClass = false; j++; continue }
        if (src[j] === '/' && !inClass) break
        j++
      }
      j++ // 閉じる /
      while (j < src.length && /[gimsuy]/.test(src[j])) j++ // フラグ
      tokens.push({ type: T.REGEX, value: src.slice(i, j), line })
      i = j
      continue
    }

    // 文字列リテラル ' または "
    if (ch === '"' || ch === "'") {
      let j = i + 1
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\n') line++
        if (src[j] === '\\') {
          j++
          if (j < src.length && src[j] === '\n') line++
        }
        j++
      }
      tokens.push({ type: T.STRING, value: src.slice(i + 1, j), quote: ch, start: i, end: j + 1, line })
      i = j + 1
      continue
    }

    // テンプレートリテラル `...`
    if (ch === '`') {
      let j = i + 1, depth = 0
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === '\n') { line++; j++; continue }
        if (src.slice(j, j + 2) === '${') { depth++; j += 2; continue }
        if (src[j] === '}' && depth > 0) { depth--; j++; continue }
        if (src[j] === '`' && depth === 0) break
        j++
      }
      tokens.push({ type: T.TEMPLATE, value: src.slice(i + 1, j), line })
      i = j + 1
      continue
    }

    // 数値リテラル
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i
      if (src[j] === '0' && (src[j + 1] === 'x' || src[j + 1] === 'X')) {
        // 16進数: 0x または 0X に続く [0-9a-fA-F_]
        j += 2
        while (j < src.length && /[0-9a-fA-F_]/.test(src[j])) j++
      } else {
        // 10進数 / 2進数 / 8進数 / 科学的記数法
        while (j < src.length && /[0-9.eEoObBn_]/.test(src[j])) j++
        // 指数符号: 1e+10 / 1e-5
        if (j > i && /[eE]/.test(src[j - 1]) && (src[j] === '+' || src[j] === '-')) {
          j++
          while (j < src.length && /[0-9_]/.test(src[j])) j++
        }
      }
      tokens.push({ type: T.NUMBER, value: src.slice(i, j), line })
      i = j
      continue
    }

    // 識別子またはキーワード
    if (/[a-zA-Z_$]/.test(ch)) {
      let j = i
      while (j < src.length && /[a-zA-Z0-9_$]/.test(src[j])) j++
      const value = src.slice(i, j)
      tokens.push({ type: KEYWORDS.has(value) ? T.KW : T.IDENT, value, line })
      i = j
      continue
    }

    // 複数文字演算子
    let matched = false
    for (const op of MULTI_OPS) {
      if (src.slice(i, i + op.length) === op) {
        tokens.push({ type: T.OP, value: op, line })
        i += op.length
        matched = true
        break
      }
    }
    if (matched) continue

    // 単一文字
    tokens.push({ type: T.PUNC, value: ch, line })
    i++
  }

  return tokens
}
