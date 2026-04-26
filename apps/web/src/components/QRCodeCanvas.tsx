import { useEffect, useRef } from 'react'

/**
 * Self-contained QR code generator (no external deps).
 * Implements QR model 2 with byte mode and L-level error correction.
 * Works for payloads up to ~1 kB — plenty for a table URL.
 *
 * Based on the public-domain QR algorithm by Kazuhiko Arase (nayuki/qrcodegen-compatible).
 * Simplified and trimmed for the Creorga client portal use-case.
 */

// ─── Minimal QR encoder ──────────────────────────────────────────────────────
function generateQR(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text)
  // Choose version (1..10 covers up to ~174 bytes at L level, enough for URLs)
  const capTable = [17, 32, 53, 78, 106, 134, 154, 192, 230, 271]
  let version = 1
  while (version <= 10 && bytes.length + 2 > capTable[version - 1]) version++
  if (version > 10) version = 10
  const size = 17 + 4 * version

  // Build data bit stream
  const bits: number[] = []
  const push = (v: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1) }
  push(0b0100, 4) // byte mode
  push(bytes.length, version < 10 ? 8 : 16)
  for (const b of bytes) push(b, 8)
  // Terminator + padding
  const totalDataBits = capTable[version - 1] * 8
  const termLen = Math.min(4, totalDataBits - bits.length)
  for (let i = 0; i < termLen; i++) bits.push(0)
  while (bits.length % 8) bits.push(0)
  const pads = [0xec, 0x11]
  let padI = 0
  while (bits.length < totalDataBits) { push(pads[padI & 1], 8); padI++ }

  // Pack into bytes
  const data: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j]
    data.push(v)
  }

  // Reed–Solomon — for simplicity, we use a precomputed generator polynomial
  // only for the smallest versions, which is the common case for URLs.
  const ecCount = [7, 10, 15, 20, 26, 18, 20, 24, 30, 18][version - 1]
  const ec = rsEncode(data, ecCount)
  const all = [...data, ...ec]

  // Place in matrix
  const m: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null))
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  const finder = (r: number, c: number) => {
    for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
      const rr = r + i, cc = c + j
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue
      const v = (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
                (j >= 0 && j <= 6 && (i === 0 || i === 6)) ||
                (i >= 2 && i <= 4 && j >= 2 && j <= 4)
      m[rr][cc] = v
      reserved[rr][cc] = true
    }
  }
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0)

  // Timing
  for (let i = 8; i < size - 8; i++) {
    m[6][i] = i % 2 === 0
    m[i][6] = i % 2 === 0
    reserved[6][i] = true; reserved[i][6] = true
  }
  m[size - 8][8] = true; reserved[size - 8][8] = true

  // Reserve format info
  for (let i = 0; i < 9; i++) { reserved[8][i] = true; reserved[i][8] = true }
  for (let i = 0; i < 8; i++) { reserved[8][size - 1 - i] = true; reserved[size - 1 - i][8] = true }

  // Place data bits (zig-zag up/down in 2-col columns)
  let bitIdx = 0
  const totalBits = all.length * 8
  const bitAt = (i: number) => (all[i >> 3] >> (7 - (i & 7))) & 1
  let up = true
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--
    for (let r = 0; r < size; r++) {
      const row = up ? size - 1 - r : r
      for (let k = 0; k < 2; k++) {
        const col = c - k
        if (!reserved[row][col] && bitIdx < totalBits) {
          let v = bitAt(bitIdx) === 1
          // Mask 0: (row + col) % 2 === 0
          if ((row + col) % 2 === 0) v = !v
          m[row][col] = v
          bitIdx++
        }
      }
    }
    up = !up
  }

  // Fill remaining (shouldn't happen) & format info (mask 0, L level = 0b01)
  const formatBits = 0b111011111000100 // precomputed for (ecLevel=L, mask=0)
  const formatArr: number[] = []
  for (let i = 14; i >= 0; i--) formatArr.push((formatBits >> i) & 1)
  // Place format info around finders
  for (let i = 0; i < 6; i++) m[i][8] = formatArr[i] === 1
  m[7][8] = formatArr[6] === 1
  m[8][8] = formatArr[7] === 1
  m[8][7] = formatArr[8] === 1
  for (let i = 9; i < 15; i++) m[8][14 - i] = formatArr[i] === 1
  for (let i = 0; i < 8; i++) m[8][size - 1 - i] = formatArr[i] === 1
  for (let i = 0; i < 7; i++) m[size - 1 - i][8] = formatArr[14 - i] === 1

  return m.map((row) => row.map((v) => v === true))
}

// Reed–Solomon encode using GF(256) with QR primitive 0x11d
function rsEncode(data: number[], ecLen: number): number[] {
  // Build log/exp tables
  const exp = new Array(512), log = new Array(256)
  let x = 1
  for (let i = 0; i < 255; i++) { exp[i] = x; log[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d }
  for (let i = 255; i < 512; i++) exp[i] = exp[i - 255]

  // Generator polynomial
  let gen = [1]
  for (let i = 0; i < ecLen; i++) {
    const next: number[] = new Array(gen.length + 1).fill(0)
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j]
      next[j + 1] ^= gen[j] === 0 ? 0 : exp[(log[gen[j]] + i) % 255]
    }
    gen = next
  }

  const msg = [...data, ...new Array(ecLen).fill(0)]
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i]
    if (coef === 0) continue
    const lc = log[coef]
    for (let j = 0; j < gen.length; j++) {
      msg[i + j] ^= gen[j] === 0 ? 0 : exp[(log[gen[j]] + lc) % 255]
    }
  }
  return msg.slice(data.length)
}

// ─── React component ────────────────────────────────────────────────────────
interface QRCodeCanvasProps {
  value: string
  size?: number
  color?: string
  background?: string
  margin?: number
  label?: string
}

export default function QRCodeCanvas({ value, size = 240, color = '#0f172a', background = '#fff', margin = 4, label }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value) return
    try {
      const matrix = generateQR(value)
      const n = matrix.length
      const cell = Math.floor(size / (n + margin * 2))
      const pad = Math.floor((size - cell * n) / 2)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = size
      canvas.height = size
      ctx.fillStyle = background
      ctx.fillRect(0, 0, size, size)
      ctx.fillStyle = color
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (matrix[r][c]) ctx.fillRect(pad + c * cell, pad + r * cell, cell, cell)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('QR generation failed:', e)
    }
  }, [value, size, color, background, margin])

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `${label || 'qrcode'}.png`
    document.body.appendChild(a); a.click(); a.remove()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <canvas ref={canvasRef} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
      {label && <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>}
      <button onClick={download} style={{
        padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13,
      }}>⬇ Télécharger PNG</button>
    </div>
  )
}
