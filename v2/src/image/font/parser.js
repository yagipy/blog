// TTF parser — reads cmap/glyf/loca/hmtx/head tables, pure JS, no deps

function r8(v, o)  { return v.getUint8(o) }
function r16(v, o) { return v.getUint16(o, false) }
function r16s(v,o) { return v.getInt16(o, false) }
function r32(v, o) { return v.getUint32(o, false) }

function tableMap(view) {
  const n = r16(view, 4)
  const tables = {}
  for (let i = 0; i < n; i++) {
    const base = 12 + i * 16
    const tag = String.fromCharCode(
      r8(view, base), r8(view, base+1), r8(view, base+2), r8(view, base+3))
    tables[tag] = { offset: r32(view, base+8) }
  }
  return tables
}

function parseCmap(view, off) {
  const numTables = r16(view, off + 2)
  for (let i = 0; i < numTables; i++) {
    const platformId = r16(view, off + 4 + i * 8)
    const encodingId = r16(view, off + 6 + i * 8)
    const subOff = off + r32(view, off + 8 + i * 8)
    const fmt = r16(view, subOff)
    // prefer (3,1) Windows BMP or (0,3) Unicode BMP, both format 4
    if (fmt === 4 && ((platformId === 3 && encodingId === 1) || platformId === 0)) {
      return parseCmapFmt4(view, subOff)
    }
  }
  // fallback: first format 4
  for (let i = 0; i < numTables; i++) {
    const subOff = off + r32(view, off + 8 + i * 8)
    if (r16(view, subOff) === 4) return parseCmapFmt4(view, subOff)
  }
  return new Map()
}

function parseCmapFmt4(view, off) {
  const segCount = r16(view, off + 6) / 2
  const endBase   = off + 14
  const startBase = endBase + 2 + segCount * 2
  const deltaBase = startBase + segCount * 2
  const rangeBase = deltaBase + segCount * 2
  const map = new Map()
  for (let i = 0; i < segCount; i++) {
    const endCode   = r16(view, endBase   + i * 2)
    const startCode = r16(view, startBase + i * 2)
    const delta     = r16s(view, deltaBase + i * 2)
    const rangeOff  = r16(view, rangeBase + i * 2)
    if (endCode === 0xffff) break
    for (let c = startCode; c <= endCode; c++) {
      let glyphId
      if (rangeOff === 0) {
        glyphId = (c + delta) & 0xffff
      } else {
        const idx = rangeBase + i * 2 + rangeOff + (c - startCode) * 2
        glyphId = r16(view, idx)
        if (glyphId !== 0) glyphId = (glyphId + delta) & 0xffff
      }
      if (glyphId !== 0) map.set(c, glyphId)
    }
  }
  return map
}

function parseGlyph(view, off, len) {
  if (len === 0) return { contours: [], bounds: { xMin: 0, yMin: 0, xMax: 0, yMax: 0 } }
  const numContours = r16s(view, off)
  const bounds = {
    xMin: r16s(view, off + 2),
    yMin: r16s(view, off + 4),
    xMax: r16s(view, off + 6),
    yMax: r16s(view, off + 8),
  }
  if (numContours >= 0) return parseSimpleGlyph(view, off, numContours, bounds)
  return parseCompositeGlyph(view, off, bounds)
}

function parseSimpleGlyph(view, off, numContours, bounds) {
  const endPtsOff = off + 10
  const endPts = []
  for (let i = 0; i < numContours; i++) endPts.push(r16(view, endPtsOff + i * 2))
  const instrLen = r16(view, endPtsOff + numContours * 2)
  let pos = endPtsOff + numContours * 2 + 2 + instrLen
  const nPts = endPts[numContours - 1] + 1
  const flags = new Uint8Array(nPts)
  for (let i = 0; i < nPts; ) {
    const f = r8(view, pos++)
    flags[i++] = f
    if (f & 8) { const rep = r8(view, pos++); for (let r = 0; r < rep; r++) flags[i++] = f }
  }
  const xs = new Int16Array(nPts)
  let cur = 0
  for (let i = 0; i < nPts; i++) {
    const f = flags[i]
    if (f & 2)      { const d = r8(view, pos++); cur += (f & 16) ? d : -d }
    else if (!(f & 16)) { cur += r16s(view, pos); pos += 2 }
    xs[i] = cur
  }
  const ys = new Int16Array(nPts)
  cur = 0
  for (let i = 0; i < nPts; i++) {
    const f = flags[i]
    if (f & 4)      { const d = r8(view, pos++); cur += (f & 32) ? d : -d }
    else if (!(f & 32)) { cur += r16s(view, pos); pos += 2 }
    ys[i] = cur
  }
  const contours = []
  let start = 0
  for (let ci = 0; ci < endPts.length; ci++) {
    const end = endPts[ci]
    const pts = []
    for (let i = start; i <= end; i++) {
      pts.push({ x: xs[i], y: ys[i], onCurve: !!(flags[i] & 1) })
    }
    contours.push(pts)
    start = end + 1
  }
  return { contours, bounds, composite: false }
}

function parseCompositeGlyph(view, off, bounds) {
  // return component references for later resolution
  const components = []
  let pos = off + 10
  let flags
  do {
    flags = r16(view, pos); pos += 2
    const glyphIndex = r16(view, pos); pos += 2
    let dx = 0, dy = 0
    if (flags & 1) {  // ARG_1_AND_2_ARE_WORDS
      if (flags & 2) { dx = r16s(view, pos); dy = r16s(view, pos+2) }  // ARGS_ARE_XY_VALUES
      pos += 4
    } else {
      if (flags & 2) { dx = view.getInt8(pos); dy = view.getInt8(pos+1) }  // ARGS_ARE_XY_VALUES
      pos += 2
    }
    let xx = 1, yx = 0, xy = 0, yy = 1
    if (flags & 8)  { xx = yy = r16s(view, pos) / 16384; pos += 2 }
    else if (flags & 64)  { xx = r16s(view, pos) / 16384; yy = r16s(view, pos+2) / 16384; pos += 4 }
    else if (flags & 128) { xx = r16s(view, pos) / 16384; yx = r16s(view, pos+2) / 16384; xy = r16s(view, pos+4) / 16384; yy = r16s(view, pos+6) / 16384; pos += 8 }
    components.push({ glyphIndex, dx, dy, xx, yx, xy, yy })
  } while (flags & 32)
  return { contours: null, bounds, composite: true, components }
}

function applyTransform(contours, dx, dy, xx, yx, xy, yy) {
  return contours.map(pts => pts.map(p => ({
    x: Math.round(p.x * xx + p.y * xy + dx),
    y: Math.round(p.x * yx + p.y * yy + dy),
    onCurve: p.onCurve,
  })))
}

export function parseFont(buffer) {
  const view = new DataView(buffer)
  const tables = tableMap(view)

  const headOff = tables['head'].offset
  const unitsPerEm = r16(view, headOff + 18)
  const indexToLocFormat = r16s(view, headOff + 50)

  const locaOff = tables['loca'].offset
  function glyphOffset(id) {
    if (indexToLocFormat === 0) {
      return r16(view, locaOff + id * 2) * 2
    }
    return r32(view, locaOff + id * 4)
  }
  function glyphLength(id) {
    return glyphOffset(id + 1) - glyphOffset(id)
  }

  const gyfOff = tables['glyf'].offset

  const cmapMap = parseCmap(view, tables['cmap'].offset)

  const hmtxOff = tables['hmtx'].offset
  const hmtxN   = tables['hhea'] ? r16(view, tables['hhea'].offset + 34) : 0

  function getAdvanceWidth(id) {
    if (hmtxN === 0) return 0
    if (id < hmtxN) return r16(view, hmtxOff + id * 4)
    return r16(view, hmtxOff + (hmtxN - 1) * 4)
  }

  const glyphCache = new Map()
  const resolving = new Set()
  function getGlyph(id) {
    if (glyphCache.has(id)) return glyphCache.get(id)
    if (resolving.has(id)) return null  // cycle in composite references
    const off = gyfOff + glyphOffset(id)
    const len = glyphLength(id)
    const g = parseGlyph(view, off, len)
    if (g.composite) {
      resolving.add(id)
      try {
        const merged = []
        for (const c of g.components) {
          const sub = getGlyph(c.glyphIndex)
          if (!sub || !sub.contours) continue
          merged.push(...applyTransform(sub.contours, c.dx, c.dy, c.xx, c.yx, c.xy, c.yy))
        }
        g.contours = merged
      } finally {
        resolving.delete(id)
        glyphCache.set(id, g)  // cache even on exception so retries return empty glyph, not rethrow
      }
      return g
    }
    glyphCache.set(id, g)
    return g
  }

  function getGlyphId(codepoint) {
    return cmapMap.get(codepoint) ?? 0
  }

  return { getGlyph, getGlyphId, getAdvanceWidth, unitsPerEm }
}
