// PNG encoder — no compression (zlib stored blocks), pure JS, no deps
// encodePng(width, height, rgba: Uint8ClampedArray) → Uint8Array

const PNG_SIG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

// CRC32 lookup table
const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  CRC_TABLE[n] = c
}

function crc32(buf, off, len) {
  let c = 0xffffffff
  for (let i = off; i < off + len; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function adler32(buf) {
  let s1 = 1, s2 = 0
  const NMAX = 5552  // max bytes before s1/s2 can overflow 32-bit without mod
  for (let i = 0; i < buf.length; ) {
    const end = Math.min(i + NMAX, buf.length)
    while (i < end) { s1 += buf[i++]; s2 += s1 }
    s1 %= 65521; s2 %= 65521
  }
  return (s2 << 16) | s1
}

function writeU32(buf, off, v) {
  buf[off]   = (v >>> 24) & 0xff
  buf[off+1] = (v >>> 16) & 0xff
  buf[off+2] = (v >>>  8) & 0xff
  buf[off+3] =  v         & 0xff
}

function chunk(type, data) {
  const typeBytes = type.split('').map(c => c.charCodeAt(0))
  const len = data.length
  const out = new Uint8Array(12 + len)
  writeU32(out, 0, len)
  out.set(typeBytes, 4)
  out.set(data, 8)
  const crc = crc32(out, 4, 4 + len)
  writeU32(out, 8 + len, crc)
  return out
}

function ihdr(width, height) {
  const d = new Uint8Array(13)
  writeU32(d, 0, width)
  writeU32(d, 4, height)
  d[8]  = 8  // bit depth
  d[9]  = 6  // color type: RGBA
  d[10] = 0  // compression
  d[11] = 0  // filter
  d[12] = 0  // interlace
  return chunk('IHDR', d)
}

// Build raw scanlines: filter byte (0) + RGBA row
function buildRaw(width, height, rgba) {
  const rowBytes = width * 4
  const raw = new Uint8Array(height * (1 + rowBytes))
  for (let y = 0; y < height; y++) {
    const outOff = y * (1 + rowBytes)
    raw[outOff] = 0  // filter = None
    raw.set(rgba.subarray(y * rowBytes, (y + 1) * rowBytes), outOff + 1)
  }
  return raw
}

// zlib stored blocks wrapper (BTYPE=00, no compression)
function zlibStore(data) {
  const BSIZE = 65535
  const nBlocks = Math.ceil(data.length / BSIZE) || 1
  // 2 (zlib header) + nBlocks * 5 (block header) + data.length + 4 (adler32)
  const out = new Uint8Array(2 + nBlocks * 5 + data.length + 4)
  out[0] = 0x78; out[1] = 0x01  // zlib header: CM=8, CINFO=7, FCHECK=1
  let pos = 2
  for (let i = 0; i < nBlocks; i++) {
    const start = i * BSIZE
    const end = Math.min(start + BSIZE, data.length)
    const blen = end - start
    const last = i === nBlocks - 1 ? 1 : 0
    out[pos++] = last
    out[pos++] = blen & 0xff
    out[pos++] = (blen >>> 8) & 0xff
    out[pos++] = (~blen) & 0xff
    out[pos++] = ((~blen) >>> 8) & 0xff
    out.set(data.subarray(start, end), pos)
    pos += blen
  }
  const a = adler32(data)
  writeU32(out, pos, a)
  return out
}

export function encodePng(width, height, rgba) {
  const raw = buildRaw(width, height, rgba)
  const compressed = zlibStore(raw)
  const parts = [
    PNG_SIG,
    ihdr(width, height),
    chunk('IDAT', compressed),
    chunk('IEND', new Uint8Array(0)),
  ]
  const total = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const p of parts) { out.set(p, off); off += p.length }
  return out
}
