// Scan-line rasterizer for TrueType glyph outlines
// rasterizeText(font, text, sizePx, color?) → { pixels: Uint8ClampedArray(RGBA), width, height }

// Expand implicit on-curve points between consecutive off-curve points
function expandContour(pts) {
  const out = []
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const cur  = pts[i]
    const next = pts[(i + 1) % n]
    out.push(cur)
    if (!cur.onCurve && !next.onCurve) {
      out.push({ x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2, onCurve: true })
    }
  }
  return out
}

// Flatten one contour into line segments in strip coordinates
function flattenContour(pts, scale, xOff, bl) {
  const expanded = expandContour(pts)
  const segs = []
  const n = expanded.length
  let i = 0
  while (i < n) {
    const p0 = expanded[i]
    const p1 = expanded[(i + 1) % n]
    if (p0.onCurve && p1.onCurve) {
      segs.push({
        x1: p0.x * scale + xOff, y1: bl - p0.y * scale,
        x2: p1.x * scale + xOff, y2: bl - p1.y * scale,
      })
      i++
    } else if (p0.onCurve && !p1.onCurve) {
      const p2 = expanded[(i + 2) % n]
      let ax = p0.x, ay = p0.y
      for (let t = 1; t <= 16; t++) {
        const u = t / 16
        const bx = p0.x*(1-u)*(1-u) + 2*p1.x*(1-u)*u + p2.x*u*u
        const by = p0.y*(1-u)*(1-u) + 2*p1.y*(1-u)*u + p2.y*u*u
        segs.push({
          x1: ax * scale + xOff, y1: bl - ay * scale,
          x2: bx * scale + xOff, y2: bl - by * scale,
        })
        ax = bx; ay = by
      }
      i += 2
    } else {
      i++
    }
  }
  return segs
}

// Render a string into a single RGBA pixel strip.
// Coordinate system: TTF y increases upward; baseline at (sizePx * 0.75) from top in strip.
export function rasterizeText(font, text, sizePx, color) {
  const scale = sizePx / font.unitsPerEm
  const [cr, cg, cb] = color ?? [17, 24, 39]

  // Collect glyph metadata and total width
  const glyphs = []
  let totalWidth = 0
  for (const ch of text) {
    const id  = font.getGlyphId(ch.codePointAt(0))
    const adv = Math.round(font.getAdvanceWidth(id) * scale)
    glyphs.push({ id, adv, g: font.getGlyph(id) })
    totalWidth += adv
  }
  if (totalWidth === 0) return { pixels: new Uint8ClampedArray(0), width: 0, height: 0 }

  // Strip dimensions — tall enough to include descenders
  const height   = Math.ceil(sizePx * 1.5)
  const baseline = Math.round(height * 0.72)  // distance from top to baseline

  const pixels = new Uint8ClampedArray(totalWidth * height * 4)

  let curX = 0
  for (const { g, adv } of glyphs) {
    if (!g || !g.contours || g.contours.length === 0) { curX += adv; continue }

    // Build segments in strip coordinates (baseline-relative, x offset by curX)
    const allSegs = []
    for (const pts of g.contours) {
      for (const s of flattenContour(pts, scale, curX, baseline)) allSegs.push(s)
    }

    // Scan-fill this glyph's column range
    const xMin = curX
    const xMax = curX + adv
    for (let y = 0; y < height; y++) {
      const yf = y + 0.5
      // Non-zero winding rule — required by TrueType spec (even-odd causes white holes in crossing strokes)
      const crossings = []
      for (const { x1, y1, x2, y2 } of allSegs) {
        if (y1 <= yf && y2 > yf) {
          crossings.push({ x: x1 + (yf - y1) / (y2 - y1) * (x2 - x1), dir: +1 })
        } else if (y2 <= yf && y1 > yf) {
          crossings.push({ x: x1 + (yf - y1) / (y2 - y1) * (x2 - x1), dir: -1 })
        }
      }
      if (crossings.length < 2) continue
      crossings.sort((a, b) => a.x - b.x)
      let winding = 0
      for (let ci = 0; ci < crossings.length - 1; ci++) {
        winding += crossings[ci].dir
        if (winding !== 0) {
          const xStart = Math.max(xMin, Math.ceil(crossings[ci].x))
          const xEnd   = Math.min(xMax - 1, Math.floor(crossings[ci + 1].x))
          for (let x = xStart; x <= xEnd; x++) {
            const off = (y * totalWidth + x) * 4
            pixels[off] = cr; pixels[off+1] = cg; pixels[off+2] = cb; pixels[off+3] = 255
          }
        }
      }
    }
    curX += adv
  }

  return { pixels, width: totalWidth, height }
}
