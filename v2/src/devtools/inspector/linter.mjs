import { tokenize, T } from './tokenizer.mjs'

// ── JS 組み込みのホワイトリスト ────────────────────────────────────────────────
// 言語仕様の一部（ブラウザ・Node.js 両方に存在）。platform.mjs 不要。

const JS_BUILTINS = new Set([
  // 数値・定数
  'NaN', 'Infinity', 'arguments',
  // グローバル関数
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'queueMicrotask',
  // コンストラクタ
  'Object', 'Array', 'Function', 'String', 'Number', 'Boolean',
  'Symbol', 'BigInt',
  'Error', 'TypeError', 'RangeError', 'ReferenceError',
  'SyntaxError', 'URIError', 'EvalError', 'AggregateError',
  'Promise', 'Proxy', 'Reflect',
  'Set', 'Map', 'WeakSet', 'WeakMap', 'WeakRef', 'FinalizationRegistry',
  'Date', 'RegExp',
  'ArrayBuffer', 'DataView',
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray',
  'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array',
  'Float32Array', 'Float64Array',
  'BigInt64Array', 'BigUint64Array',
  // 名前空間
  'Math', 'JSON', 'Atomics',
  // デバッグ
  'console',
])

// ── スコープ解析 ───────────────────────────────────────────────────────────────

/**
 * トークン列からスコープ情報を構築し、
 * 「指定位置で指定名がローカル宣言されているか」と
 * 「指定位置が宣言サイトか（グローバルチェック除外）」を返す関数を生成する。
 *
 * 対応: let/const/var・function 宣言+パラメータ・
 *       アロー関数パラメータ・import バインディング・class・catch
 */
function buildScopeInfo(tokens) {
  const depths = new Array(tokens.length).fill(0)
  const decls = []      // { name, depth }
  const declSites = new Set()  // 宣言サイトのトークンインデックス（チェック除外）
  let depth = 0

  function declare(name, d, tokenIdx) {
    if (name && typeof name === 'string') {
      decls.push({ name, depth: d })
      if (tokenIdx != null) declSites.add(tokenIdx)
    }
  }

  // ( ... ) 内の識別子を収集（関数パラメータ用）
  function collectParams(openIdx, scopeDepth) {
    if (tokens[openIdx]?.value !== '(') return
    let j = openIdx + 1
    while (j < tokens.length && tokens[j]?.value !== ')') {
      if (tokens[j]?.type === T.IDENT) declare(tokens[j].value, scopeDepth, j)
      j++
    }
  }

  // let x, y, z や let x = 1, y = 2 などカンマ区切りの複数宣言を収集
  function collectDeclarators(startIdx, scopeDepth) {
    let j = startIdx
    while (j < tokens.length) {
      if (tokens[j]?.type === T.IDENT) {
        declare(tokens[j].value, scopeDepth, j); j++
      } else if (tokens[j]?.value === '{') {
        collectObjectDestructure(j, scopeDepth); j++
      } else if (tokens[j]?.value === '[') {
        collectArrayDestructure(j, scopeDepth); j++
      } else if (tokens[j]?.value === ',') {
        j++  // 次の宣言子へ
      } else if (tokens[j]?.value === '=') {
        // 初期化式をスキップ（単純な値のみ、ネストしたカンマには注意）
        j++
        let nested = 0
        while (j < tokens.length) {
          const v = tokens[j]?.value
          if ('([{'.includes(v)) nested++
          else if (')]}'.includes(v)) { if (nested === 0) break; nested-- }
          else if (v === ',' && nested === 0) break
          else if (isStmtStart(tokens[j]) && nested === 0) break
          j++
        }
      } else { break }
    }
  }

  function isStmtStart(t) {
    return t?.type === T.KW &&
      ['let','const','var','function','if','for','while','return','class','import','export'].includes(t?.value)
  }

  // { a, b: c, ...d } の分割代入から宣言名を収集
  function collectObjectDestructure(openIdx, scopeDepth) {
    if (tokens[openIdx]?.value !== '{') return
    let j = openIdx + 1
    while (j < tokens.length && tokens[j]?.value !== '}') {
      if (tokens[j]?.type === T.IDENT) {
        if (tokens[j + 1]?.value === ':') {
          j += 2  // { key: binding } → binding が宣言名
          if (tokens[j]?.type === T.IDENT) { declare(tokens[j].value, scopeDepth, j); j++ }
        } else {
          declare(tokens[j].value, scopeDepth, j); j++
        }
      } else { j++ }
    }
  }

  // [ a, b ] の配列分割代入から宣言名を収集
  function collectArrayDestructure(openIdx, scopeDepth) {
    if (tokens[openIdx]?.value !== '[') return
    let j = openIdx + 1
    while (j < tokens.length && tokens[j]?.value !== ']') {
      if (tokens[j]?.type === T.IDENT) { declare(tokens[j].value, scopeDepth, j) }
      j++
    }
  }

  // ── Pass 1: 深度・宣言収集 ─────────────────────────────────────────────────
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    depths[i] = depth

    if (t.type === T.PUNC) {
      if (t.value === '{') { depth++; continue }
      if (t.value === '}') { depth = Math.max(0, depth - 1); continue }
    }

    if (t.type !== T.KW) continue

    // let / const（複数変数宣言・分割代入も対応）
    if (t.value === 'let' || t.value === 'const') {
      collectDeclarators(i + 1, depth)
      continue
    }

    // var（簡易: モジュールスコープにホイスト）
    if (t.value === 'var') {
      collectDeclarators(i + 1, 0)
      continue
    }

    // function name(params) { }
    if (t.value === 'function') {
      if (tokens[i + 1]?.type === T.IDENT) {
        declare(tokens[i + 1].value, depth, i + 1)
        collectParams(i + 2, depth + 1)
      } else if (tokens[i + 1]?.value === '(') {
        collectParams(i + 1, depth + 1)
      }
      continue
    }

    // get name() / set name(v) — クラス・オブジェクトのアクセサ
    if (t.value === 'get' || t.value === 'set') {
      if (tokens[i + 1]?.type === T.IDENT) {
        declSites.add(i + 1)        // メソッド名を宣言サイトとしてマーク
        collectParams(i + 2, depth + 1)  // setter のパラメータを収集
      }
      continue
    }

    // class Name
    if (t.value === 'class' && tokens[i + 1]?.type === T.IDENT) {
      declare(tokens[i + 1].value, depth, i + 1)
      continue
    }

    // catch (e)
    if (t.value === 'catch' && tokens[i + 1]?.value === '(' && tokens[i + 2]?.type === T.IDENT) {
      declare(tokens[i + 2].value, depth + 1, i + 2)
      continue
    }

    // export { a, b } — 再エクスポートの名前を宣言サイトとしてマーク
    if (t.value === 'export' && tokens[i + 1]?.value === '{') {
      let j = i + 2
      while (j < tokens.length && tokens[j]?.value !== '}') {
        if (tokens[j]?.type === T.IDENT) declSites.add(j)
        j++
      }
      continue
    }

    // import { a, b as c } from '...' または import a from '...'
    if (t.value === 'import' && tokens[i + 1]?.value !== '(') {
      let j = i + 1
      // import * as name
      if (tokens[j]?.value === '*' && tokens[j + 1]?.value === 'as' && tokens[j + 2]?.type === T.IDENT) {
        declare(tokens[j + 2].value, 0, j + 2); continue
      }
      // デフォルト import
      if (tokens[j]?.type === T.IDENT && tokens[j + 1]?.value !== '(') {
        declare(tokens[j].value, 0, j); j++
        if (tokens[j]?.value === ',') j++
      }
      // 名前付き import { a, b as c }
      if (tokens[j]?.value === '{') {
        j++
        while (j < tokens.length && tokens[j]?.value !== '}') {
          if (tokens[j]?.type === T.IDENT) {
            if (tokens[j + 1]?.value === 'as' && tokens[j + 2]?.type === T.IDENT) {
              declSites.add(j)  // 元の名前（a）も宣言サイトとしてマーク
              declare(tokens[j + 2].value, 0, j + 2); j += 3
            } else {
              declare(tokens[j].value, 0, j); j++
            }
          } else { j++ }
        }
      }
    }
  }

  // ── Pass 2: アロー関数パラメータ ─────────────────────────────────────────────
  for (let i = 0; i < tokens.length; i++) {
    if (!(tokens[i]?.type === T.OP && tokens[i].value === '=>')) continue
    const arrowDepth = depths[i]

    // x => ...（単一パラメータ）
    if (tokens[i - 1]?.type === T.IDENT) {
      declare(tokens[i - 1].value, arrowDepth, i - 1)
      continue
    }

    // (x, y) => ...（括弧付き）
    if (tokens[i - 1]?.value === ')') {
      let j = i - 2, parens = 1
      while (j >= 0 && parens > 0) {
        if (tokens[j]?.value === ')') parens++
        else if (tokens[j]?.value === '(') parens--
        j--
      }
      for (let k = j + 2; k < i - 1; k++) {
        if (tokens[k]?.type === T.IDENT) declare(tokens[k].value, arrowDepth, k)
      }
    }
  }

  /** name が usageIdx 位置でローカル宣言されているか */
  const isLocal = (name, usageIdx) => {
    const d = depths[usageIdx] ?? 0
    return decls.some(dec => dec.name === name && dec.depth <= d)
  }

  /** usageIdx が宣言サイト（let x, function f 等の直後）かどうか */
  const isDeclSite = idx => declSites.has(idx)

  return { isLocal, isDeclSite }
}

// ── ルール定義 ────────────────────────────────────────────────────────────────

const ALLOWED_IMPORTS = new Set(['markdown', 'bayes'])

const RULES = {
  /** var は let/const に統一する */
  'no-var': tokens => tokens
    .filter(t => t.type === T.KW && t.value === 'var')
    .map(t => ({ line: t.line, rule: 'no-var', message: '`var` の代わりに `let` または `const` を使ってください' })),

  /** == / != は === / !== を使う */
  'eqeqeq': tokens => tokens
    .filter(t => t.type === T.OP && (t.value === '==' || t.value === '!='))
    .map(t => ({ line: t.line, rule: 'eqeqeq', message: `\`${t.value}\` の代わりに \`${t.value}=\` を使ってください` })),

  /** debugger 文を残さない */
  'no-debugger': tokens => tokens
    .filter(t => t.type === T.KW && t.value === 'debugger')
    .map(t => ({ line: t.line, rule: 'no-debugger', message: '`debugger` 文が残っています' })),

  /** 文字列はシングルクォートに統一する */
  'quotes': tokens => tokens
    .filter(t => t.type === T.STRING && t.quote === '"')
    .map(t => ({ line: t.line, rule: 'quotes', message: 'シングルクォートを使ってください' })),

  /** eval・new Function を禁止する */
  'no-eval': tokens => {
    const warnings = []
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      if (t.type === T.IDENT && t.value === 'eval' && tokens[i + 1]?.value === '(')
        warnings.push({ line: t.line, rule: 'no-eval', message: '`eval` は使用できません（静的解析が無効になります）' })
      if (t.type === T.KW && t.value === 'new' && tokens[i + 1]?.value === 'Function')
        warnings.push({ line: t.line, rule: 'no-eval', message: '`new Function` は使用できません（`eval` と同等です）' })
    }
    return warnings
  },

  /** 外部モジュールのインポートを禁止する */
  'no-external-imports': tokens => {
    const warnings = []
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      if (t.type === T.IDENT && t.value === 'from') {
        const next = tokens[i + 1]
        if (next?.type === T.STRING) {
          const v = next.value
          if (!v.startsWith('.') && !v.startsWith('/') && !ALLOWED_IMPORTS.has(v))
            warnings.push({ line: next.line, rule: 'no-external-imports', message: `外部モジュール "${v}" は使用できません` })
        }
        continue
      }
      if (t.type === T.KW && t.value === 'import') {
        const next = tokens[i + 1]
        if (!next || !(next.type === T.PUNC && next.value === '(')) continue
        const arg = tokens[i + 2]
        if (!arg) continue
        if (arg.type === T.STRING) {
          const v = arg.value
          if (!v.startsWith('.') && !v.startsWith('/') && !ALLOWED_IMPORTS.has(v))
            warnings.push({ line: arg.line, rule: 'no-external-imports', message: `外部モジュール "${v}" は使用できません` })
        } else {
          warnings.push({ line: arg.line, rule: 'no-external-imports', message: '動的 import は文字列リテラルのみ使用できます' })
        }
      }
    }
    return warnings
  },

  /**
   * スコープ解析 + ホワイトリストによるグローバルアクセス検出。
   * - JS 組み込み（Math・Promise 等）は許可
   * - platform.mjs のみすべてのグローバルを許可
   * - それ以外のファイルで宣言されていない識別子はエラー
   */
  'no-global-access': (tokens, filename) => {
    if (filename?.endsWith('platform.mjs')) return []
    if (filename?.endsWith('.worklet.mjs')) return []  // PaintWorkletGlobalScope
    if (filename?.endsWith('.worker.mjs')) return []   // WorkerGlobalScope

    const { isLocal, isDeclSite } = buildScopeInfo(tokens)

    // import 構文・export 構文で現れる文脈的キーワード（IDENT として扱われる）
    const CONTEXTUAL_KW = new Set(['from', 'as', 'of', 'target', 'meta', 'get', 'set', 'static', 'async'])

    const warnings = []

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      if (t.type !== T.IDENT) continue

      // プロパティアクセスの右辺は除外（foo.bar の bar）
      const prev = tokens[i - 1]
      if (prev?.value === '.' || prev?.value === '?.') continue

      // 宣言・制御キーワード直後の識別子は除外（let x, function f, break label 等）
      const prevVal = prev?.type === T.KW ? prev.value : null
      if (prevVal === 'function' || prevVal === 'class' ||
          prevVal === 'let' || prevVal === 'const' || prevVal === 'var' ||
          prevVal === 'break' || prevVal === 'continue') continue

      // オブジェクトキー { foo: value } の foo を除外（直後が : の場合）
      if (tokens[i + 1]?.value === ':') continue

      // オブジェクトメソッド短縮 { foo() {} } のメソッド名を除外
      // IDENT の直後が ( で、直前が { か , の場合はメソッド定義
      if (tokens[i + 1]?.value === '(' &&
          (prev?.value === '{' || prev?.value === ',')) continue

      // 宣言サイト自体を除外（パラメータ名等）
      if (isDeclSite(i)) continue

      // 文脈的キーワードを除外（from / as / of 等）
      if (CONTEXTUAL_KW.has(t.value)) continue

      // JS 組み込みは許可
      if (JS_BUILTINS.has(t.value)) continue

      // スコープ内で宣言済みは許可
      if (isLocal(t.value, i)) continue

      warnings.push({
        line: t.line,
        rule: 'no-global-access',
        message: `"${t.value}" はグローバルアクセスです。platform.mjs 経由で使うか、ローカルに宣言してください`,
      })
    }
    return warnings
  },
}

// ── メイン ────────────────────────────────────────────────────────────────────

/**
 * @param {string} source
 * @param {string[]} [rules] — 省略すると全ルール適用
 * @param {string} [filename] — ファイルごとの除外判定に使用
 * @returns {Array<{line:number, rule:string, message:string}>}
 */
export function lint(source, rules = Object.keys(RULES), filename) {
  const tokens = tokenize(source)
  const warnings = []
  for (const rule of rules) {
    if (RULES[rule]) warnings.push(...RULES[rule](tokens, filename))
  }
  return warnings.sort((a, b) => a.line - b.line)
}
