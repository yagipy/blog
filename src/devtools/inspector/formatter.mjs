import { tokenize, T } from './tokenizer.mjs'

// ── 括弧カウント（文字列・コメント内は無視）────────────────────────────────

function netBrackets(line) {
  let net = 0
  let inStr = null
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inStr) {
      if (ch === '\\') { i++; continue }
      if (ch === inStr) inStr = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue }
    // 文字列外でも \ の次の文字をスキップ（正規表現の \/ が // と誤判定されるのを防ぐ）
    if (ch === '\\') { i++; continue }
    if (ch === '/' && line[i + 1] === '/') break  // 行コメント
    if ('{(['.includes(ch)) net++
    if ('})]'.includes(ch)) net--
  }
  return net
}

function leadingClose(line) {
  let n = 0
  for (const ch of line) {
    if ('})]'.includes(ch)) n++
    else break
  }
  return n
}

// ── フォーマット処理 ──────────────────────────────────────────────────────────

/** 末尾空白の除去 */
function trimLines(source) {
  return source.split('\n').map(l => l.trimEnd()).join('\n')
}

/** CRLF → LF の正規化 */
function normalizeNewlines(source) {
  return source.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/** ファイル末尾を改行ひとつで終わらせる */
function trailingNewline(source) {
  return source.trimEnd() + '\n'
}

/** インデントの正規化（簡易版: 括弧の深度で判定、AST 不要）*/
function normalizeIndent(source, tabWidth = 2) {
  const pad = ' '.repeat(tabWidth)
  const lines = source.split('\n')
  let depth = 0
  const out = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { out.push(''); continue }

    // prevDepth を保存してから行頭の閉じ括弧で深度を下げる
    // ※ } catch (_) { のように閉じと開きが同じ行にある場合、
    //    次行の深度は「調整後の depth」ではなく「元の depth + 行全体の増減」で求める
    const prevDepth = depth
    const closes = leadingClose(line)
    depth = Math.max(0, depth - closes)

    out.push(pad.repeat(depth) + line)

    // 次行の深度: 元の深度 + 行全体の括弧の増減
    depth = Math.max(0, prevDepth + netBrackets(line))
  }

  return out.join('\n')
}

/** ダブルクォートをシングルクォートに変換（内容に ' を含む場合はスキップ）*/
function normalizeQuotes(source, tokens) {
  const parts = []
  let pos = 0
  for (const t of tokens) {
    if (t.type !== T.STRING || t.quote !== '"') continue
    if (t.value.includes("'")) continue       // シングルクォートを含む場合はスキップ
    parts.push({ start: t.start, end: t.end, replacement: `'${t.value}'` })
  }
  let result = ''
  for (const { start, end, replacement } of parts) {
    result += source.slice(pos, start) + replacement
    pos = end
  }
  return result + source.slice(pos)
}

// ── メイン ────────────────────────────────────────────────────────────────────

/**
 * @param {string} source
 * @param {{ indent?:boolean, quotes?:boolean }} [options]
 * @returns {{ code:string, changes:string[] }}
 */
export function format(source, options = {}) {
  const { indent = true, quotes = true } = options
  const changes = []
  let code = source

  const normalized = normalizeNewlines(code)
  if (normalized !== code) { changes.push('改行コードを LF に統一'); code = normalized }

  const trimmed = trimLines(code)
  if (trimmed !== code) { changes.push('末尾の空白を除去'); code = trimmed }

  const newlined = trailingNewline(code)
  if (newlined !== code) { changes.push('末尾に改行を追加'); code = newlined }

  if (indent) {
    const indented = normalizeIndent(code)
    if (indented !== code) { changes.push('インデントを統一'); code = indented }
  }

  if (quotes) {
    const tokens = tokenize(code)
    const quoted = normalizeQuotes(code, tokens)
    if (quoted !== code) { changes.push('クォートをシングルに統一'); code = quoted }
  }

  return { code, changes }
}
