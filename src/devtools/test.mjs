// node v2/src/devtools/test.mjs で確認できます
// ブラウザでも <script type="module"> で動きます

import { check } from './inspector/checker.mjs'

const src = `
/**
* @param {string} s
* @returns {string}
*/
function escHtml(s) {
  return s.replace(/&/g, '&amp;')
}

/**
* @param {number} a
* @param {number} b
* @returns {number}
*/
function add(a, b) {
  return a + b
}

const name = 'Alice'   // string
const count = 42       // number
const flag = true      // boolean
const items = []       // array

// OK な呼び出し
escHtml(name)       // string → string ✓
add(count, 10)      // number, number → number ✓

// 型エラーになるべき呼び出し
escHtml(count)      // number → string が必要 → エラー
add(name, count)    // string → number が必要 → エラー
escHtml()           // 引数不足 → エラー
`

const { errors, symbols } = check(src)

console.log('=== シンボルテーブル ===')
for (const [name, sym] of Object.entries(symbols)) {
  const jsdoc = sym.jsdoc
  ? ` (params: [${sym.jsdoc.params.map(p => `${p.name}:${p.type}`).join(', ')}])`
  : ''
  console.log(`  ${name}: ${sym.type}${jsdoc}`)
}

console.log('\n=== 型エラー ===')
if (errors.length === 0) {
  console.log('  エラーなし')
} else {
  for (const err of errors) {
    console.log(`  Line ${err.line}: ${err.message}`)
  }
}
