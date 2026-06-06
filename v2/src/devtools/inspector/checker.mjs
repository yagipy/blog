import { tokenize, T } from './tokenizer.mjs'

// ─────────────────────────────────────────────────────────────────
// モジュールレベル定数
// ─────────────────────────────────────────────────────────────────

const TYPE_ALIASES = {
  String: 'string', Number: 'number', Boolean: 'boolean',
  Object: 'object', Array: 'array', Function: 'function',
  Null: 'null', Undefined: 'undefined', Any: 'any', '*': 'any',
}

const BRACKETS_OPEN  = new Set(['(', '[', '{'])
const BRACKETS_CLOSE = new Set([')', ']', '}'])

// ─────────────────────────────────────────────────────────────────
// JSDoc パーサー
// ─────────────────────────────────────────────────────────────────

function normalizeType(t) {
  return TYPE_ALIASES[t] ?? t.toLowerCase().replace(/\s/g, '')
}

function parseJsDoc(comment) {
  const params = []
  const paramRe = /@param\s+\{([^}]+)\}\s+(\[[\w.='" ]+\]|[\w.]+)/g
  let m
  while ((m = paramRe.exec(comment)) !== null) {
    const rawName = m[2].trim()
    const optional = rawName.startsWith('[')
    // [name=default] → name (ブラケットと =以降を除去)
    const name = rawName.replace(/^\[/, '').replace(/[=\]].*/s, '').trim()
    params.push({ type: normalizeType(m[1].trim()), name, optional })
  }

  const retRe = /@returns?\s+\{([^}]+)\}/
  m = retRe.exec(comment)
  const returns = m ? normalizeType(m[1].trim()) : null

  const typeRe = /@type\s+\{([^}]+)\}/
  m = typeRe.exec(comment)
  const type = m ? normalizeType(m[1].trim()) : null

  return { params, returns, type }
}

// ─────────────────────────────────────────────────────────────────
// リテラルから型を推論
// ─────────────────────────────────────────────────────────────────

function literalType(tokens, idx) {
  const t = tokens[idx]
  if (!t) return null
  if (t.type === T.STRING || t.type === T.TEMPLATE) return 'string'
  if (t.type === T.NUMBER) return 'number'
  if (t.type === T.KW) {
    if (t.value === 'true' || t.value === 'false') return 'boolean'
    if (t.value === 'null')      return 'null'
    if (t.value === 'undefined') return 'undefined'
    if (t.value === 'function' || t.value === 'async') return 'function'
    if (t.value === 'new')       return 'object'
  }
  if (t.type === T.PUNC) {
    if (t.value === '[') return 'array'
    if (t.value === '{') return 'object'
  }
  return null
}

// ─────────────────────────────────────────────────────────────────
// シンボルテーブル構築
// ─────────────────────────────────────────────────────────────────

const STMT_KEYWORDS = new Set(['let','const','var','function','async','if','for','while','return','class'])

function isStmt(t) {
  return (t?.type === T.KW && STMT_KEYWORDS.has(t.value)) || t?.type === T.JSDOC
}

function buildSymbols(tokens) {
  const syms = {}
  let i = 0
  let pendingDoc = null
  let braceDepth = 0  // ネスト深度: 0 = トップレベル

  const peek = j => tokens[j]
  const val  = j => tokens[j]?.value

  while (i < tokens.length) {
    const t = tokens[i]

    // ブレース深度追跡
    if (t.type === T.PUNC && t.value === '{') { braceDepth++; i++; continue }
    if (t.type === T.PUNC && t.value === '}') {
      if (braceDepth > 0) { braceDepth--; pendingDoc = null }
      i++; continue
    }

    // トップレベル以外の宣言は無視
    if (braceDepth > 0) { if (t.type !== T.JSDOC) pendingDoc = null; i++; continue }

    // JSDoc を次の宣言のために保持
    if (t.type === T.JSDOC) {
      pendingDoc = parseJsDoc(t.value)
      i++
      continue
    }

    // let / const / var 変数宣言 (for ループヘッダは除外)
    if (t.type === T.KW && (t.value === 'let' || t.value === 'const' || t.value === 'var')
        && tokens[i - 1]?.value !== '(') {
      i++
      while (i < tokens.length) {
        if (peek(i)?.type !== T.IDENT) { break }
        const name = peek(i).value
        const declLine = peek(i).line
        i++

        if (val(i) === '=') {
          i++ // skip '='
          const lit = literalType(tokens, i)
          syms[name] = {
            type: pendingDoc?.type ?? lit ?? 'unknown',
            kind: t.value,
            line: declLine,
          }
          // 関数式なら JSDoc を紐付け (@type アノテーションがある場合は上書きしない)
          if ((lit === 'function' || lit === null) && pendingDoc && !pendingDoc.type) {
            syms[name].type  = 'function'
            syms[name].jsdoc = pendingDoc
          }
        } else {
          syms[name] = { type: pendingDoc?.type ?? 'unknown', kind: t.value, line: declLine }
        }

        // 次の宣言子へ (括弧の深度を追いながらスキップ)
        let skipDepth = 0
        while (i < tokens.length) {
          const sv = val(i)
          if (BRACKETS_OPEN.has(sv))  { skipDepth++; i++; continue }
          if (BRACKETS_CLOSE.has(sv)) { if (skipDepth > 0) { skipDepth--; i++; continue } else break }
          if (skipDepth === 0 && (sv === ',' || sv === ';' || isStmt(tokens[i]))) break
          i++
        }
        if (val(i) === ',') { i++; pendingDoc = null; continue }
        break
      }
      pendingDoc = null
      continue
    }

    // function 宣言
    if (t.type === T.KW && t.value === 'function') {
      const next = peek(i + 1)
      if (next?.type === T.IDENT) {
        syms[next.value] = {
          type: 'function',
          kind: 'function',
          jsdoc: pendingDoc ?? { params: [], returns: null },
          line: next.line,
        }
      }
      pendingDoc = null
      i++
      continue
    }

    // async function 宣言
    if (t.type === T.KW && t.value === 'async' && peek(i + 1)?.value === 'function') {
      const next = peek(i + 2)
      if (next?.type === T.IDENT) {
        syms[next.value] = {
          type: 'function',
          kind: 'async function',
          jsdoc: pendingDoc ?? { params: [], returns: null },
          line: next.line,
        }
      }
      pendingDoc = null
      i += 2
      continue
    }

    // export / import / default はスキップして次の宣言に pendingDoc を引き継ぐ
    if (t.type === T.KW && (t.value === 'export' || t.value === 'import' || t.value === 'default')) {
      i++
      continue
    }
    if (t.type !== T.JSDOC) pendingDoc = null
    i++
  }

  return syms
}

// ─────────────────────────────────────────────────────────────────
// 引数抽出 —— ( ... ) の中身をカンマで分割
// ─────────────────────────────────────────────────────────────────

function extractArgs(tokens, parenIdx) {
  const args = []
  let i = parenIdx + 1 // '(' の次から
  let depth = 0
  let cur = []

  while (i < tokens.length) {
    const v = tokens[i].value
    if (BRACKETS_OPEN.has(v))  depth++
    if (BRACKETS_CLOSE.has(v)) {
      if (depth === 0) break
      depth--
    }
    if (v === ',' && depth === 0) { args.push(cur); cur = []; i++; continue }
    cur.push(tokens[i])
    i++
  }
  if (cur.length > 0) args.push(cur)
  return args
}

// ─────────────────────────────────────────────────────────────────
// 引数式の型を推論
// ─────────────────────────────────────────────────────────────────

function inferArgType(argTokens, syms) {
  if (argTokens.length === 0) return 'undefined'
  const first = argTokens[0]

  // 単一トークン
  if (argTokens.length === 1) {
    const lit = literalType(argTokens, 0)
    if (lit) return lit
    // 変数参照
    if (first.type === T.IDENT) return syms[first.value]?.type ?? 'unknown'
  }

  // 単項演算子
  if (argTokens.length === 2) {
    if (first.value === '!') return 'boolean'
    if (first.value === '-' || first.value === '+') return 'number'
    if (first.type === T.KW && first.value === 'typeof') return 'string'
    if (first.type === T.KW && first.value === 'void')   return 'undefined'
  }

  // 配列リテラル [...] — 数値式ヒューリスティックより先にチェック
  if (first.value === '[') return 'array'

  // オブジェクトリテラル {...}
  if (first.value === '{') return 'object'

  // 文字列が含まれていれば文字列結合と判断
  if (argTokens.some(t => t.type === T.STRING || t.type === T.TEMPLATE)) return 'string'

  // 数値演算（数値リテラルと演算子のみで構成）
  if (argTokens.some(t => t.type === T.NUMBER) &&
      argTokens.every(t => t.type === T.NUMBER || t.type === T.OP || t.type === T.PUNC)) {
    return 'number'
  }

  // new Xxx(...)
  if (first.type === T.KW && first.value === 'new') return 'object'

  return 'unknown'
}

// ─────────────────────────────────────────────────────────────────
// 型の互換性チェック
// ─────────────────────────────────────────────────────────────────

function isCompatible(expected, actual) {
  if (expected === 'any' || actual === 'any' || actual === 'unknown') return true
  if (expected === actual) return true

  // ユニオン型: expected 側を分解
  if (expected.includes('|')) {
    return expected.split('|').map(p => p.trim()).some(p => isCompatible(p, actual))
  }
  // ユニオン型: actual 側を分解（string|null → string か null の一方が互換なら OK）
  if (actual.includes('|')) {
    return actual.split('|').map(p => p.trim()).some(p => isCompatible(expected, p))
  }

  // 配列型: string[] または Array<string>
  if ((expected.endsWith('[]') || expected.startsWith('array')) && actual === 'array') return true

  // Promise<T> → function / object
  if (expected.startsWith('promise') && (actual === 'function' || actual === 'object')) return true

  return false
}

// ─────────────────────────────────────────────────────────────────
// メインチェック関数
// ─────────────────────────────────────────────────────────────────

/**
 * @param {string} source — チェック対象の JS ソースコード
 * @returns {{ errors: Array<{line:number, message:string}>, symbols: object }}
 */
export function check(source) {
  const errors  = []
  const tokens  = tokenize(source)
  const symbols = buildSymbols(tokens)

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]

    // 関数呼び出し: IDENT( (ただしメソッド呼び出し obj.method() は除外)
    if (t.type === T.IDENT && tokens[i + 1]?.value === '(' &&
        tokens[i - 1]?.value !== '.' && tokens[i - 1]?.value !== '?.' &&
        tokens[i - 1]?.value !== 'new') {
      const fnName = t.value
      const sym = symbols[fnName]
      if (!sym || sym.type !== 'function' || !sym.jsdoc) continue

      const { params } = sym.jsdoc
      if (params.length === 0) continue

      const args = extractArgs(tokens, i + 1)

      // 引数の個数チェック（省略可能パラメータは除外）
      const required = params.filter(p =>
        !p.optional && !p.type.includes('undefined') && !p.name.startsWith('_')
      ).length
      if (args.length < required) {
        errors.push({
          line: t.line,
          message: `${fnName}(): ${required}個の引数が必要ですが、${args.length}個しかありません`,
        })
        continue
      }

      // 引数の型チェック
      for (let j = 0; j < Math.min(args.length, params.length); j++) {
        const expected = params[j].type
        const actual   = inferArgType(args[j], symbols)
        if (!isCompatible(expected, actual)) {
          errors.push({
            line: t.line,
            message: `${fnName}() の引数 "${params[j].name}": ${expected} が必要ですが、${actual} が渡されています`,
          })
        }
      }
    }
  }

  return { errors, symbols }
}
