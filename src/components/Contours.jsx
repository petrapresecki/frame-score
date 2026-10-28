import { useEffect, useRef, useState } from 'react'

// The frame's light as contour lines — lines of equal brightness, traced from
// the graded canvas, so a grade redraws them. On it, the melody: one round head
// per motif note, at the column it was taken from and the height of that
// column's brightest point (height in frame is pitch). A head fills and rings
// when the engine says it struck that note — never worked out from the clock.

const W = 160, H = 90
// three lines, at the frame's own 25th, 55th and 82nd percentile of light, so a
// night street gets as full a drawing as a sunlit one
const LEVELS = [0.25, 0.55, 0.82]
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
const ROOT_PC = 2          // the engine's root is D (music.js)

// marching squares over a blurred 160 × 90 luminance grid
function trace(src, ctx) {
  ctx.drawImage(src, 0, 0, W, H)
  const d = ctx.getImageData(0, 0, W, H).data
  let L = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255
  // five box-blur passes, so the lines are drawn rather than jagged
  for (let pass = 0; pass < 5; pass++) {
    const o = new Float32Array(W * H)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let s = 0, n = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy
        if (xx >= 0 && yy >= 0 && xx < W && yy < H) { s += L[yy * W + xx]; n++ }
      }
      o[y * W + x] = s / n
    }
    L = o
  }
  let p = ''
  const f = v => v.toFixed(2)
  const sorted = Float32Array.from(L).sort()
  const levels = LEVELS.map(q => sorted[Math.floor(q * (sorted.length - 1))])
  for (const lv of levels) {
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
      const a = L[y * W + x], b = L[y * W + x + 1], c = L[(y + 1) * W + x + 1], e = L[(y + 1) * W + x]
      const k = (a > lv) | ((b > lv) << 1) | ((c > lv) << 2) | ((e > lv) << 3)
      if (k === 0 || k === 15) continue
      const t = (u, v) => (lv - u) / (v - u)
      const T = [x + t(a, b), y], R = [x + 1, y + t(b, c)], B = [x + t(e, c), y + 1], Lf = [x, y + t(a, e)]
      const seg = { 1: [Lf, T], 2: [T, R], 3: [Lf, R], 4: [R, B], 5: [Lf, T, R, B], 6: [T, B], 7: [Lf, B],
        8: [B, Lf], 9: [B, T], 10: [T, R, B, Lf], 11: [B, R], 12: [R, Lf], 13: [R, T], 14: [T, Lf] }[k]
      for (let i = 0; i < seg.length; i += 2) p += `M${f(seg[i][0])} ${f(seg[i][1])}L${f(seg[i + 1][0])} ${f(seg[i + 1][1])}`
    }
  }
  return p
}

// where each motif note sits, and which side its label goes so neighbours
// do not print over each other
function heads(A, M) {
  const placed = []
  return M.motif.map((m, k) => {
    const col = Math.round(((m.pan + 1) / 2) * (A.peak.length - 1))
    const x = (col + 0.5) / A.peak.length, y = A.peakY[col]
    const near = placed.find(o => Math.abs(o.x - x) < 0.12 && Math.abs(o.y - y) < 0.12)
    const left = near ? !near.left : x > 0.8
    const low = !!near && near.left === (x > 0.8)
    placed.push({ x, y, left })
    return { k, col, x, y, left, low, name: NOTE[(ROOT_PC + m.semi) % 12] }
  })
}

export function Contours({ core, canvasRef, reading }) {
  const small = useRef(null)
  const [path, setPath] = useState('')
  const [hit, setHit] = useState({})
  const queued = useRef(false)

  // redraw on every reading — a grade changes the light, so it changes the lines
  useEffect(() => {
    if (!reading || !canvasRef.current || queued.current) return
    queued.current = true
    const raf = requestAnimationFrame(() => {
      queued.current = false
      if (!small.current) {
        const c = document.createElement('canvas')
        c.width = W; c.height = H
        small.current = c.getContext('2d', { willReadFrequently: true })
      }
      setPath(trace(canvasRef.current, small.current))
    })
    return () => { cancelAnimationFrame(raf); queued.current = false }
  }, [reading, canvasRef])

  const list = reading?.A && reading?.M ? heads(reading.A, reading.M) : []

  useEffect(() => {
    if (!core) return
    const timers = new Set()
    const off = core.tap(e => {
      if (e.k !== 'note' || !core.A) return
      const col = Math.round(((e.found + 1) / 2) * (core.A.peak.length - 1))
      setHit(h => ({ ...h, [col]: (h[col] ?? 0) + 1 }))
      const t = setTimeout(() => { timers.delete(t); setHit(h => ({ ...h, [col]: Math.max(0, (h[col] ?? 1) - 1) })) }, 1100)
      timers.add(t)
    })
    return () => { off(); timers.forEach(clearTimeout) }
  }, [core])

  return (
    <figure className="m-0">
      <div className="relative aspect-video">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full overflow-visible">
          <path d={path} fill="none" stroke="currentColor" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        </svg>
        {list.map(h => (
          <span
            key={h.k}
            className={`absolute flex items-center gap-[5px] whitespace-nowrap ${hit[h.col] ? 'note-hit' : ''}
                        ${h.left ? 'flex-row-reverse' : ''}`}
            style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, transform: h.left ? 'translate(calc(-100% + 6px), -6px)' : 'translate(-6px, -6px)' }}
          >
            <i className="note-head" />
            <span className={`bg-field px-[3px] text-[11.5px] ${h.low ? 'relative top-[14px]' : ''}`}>
              {h.name}<sup className="ml-px text-[8px] text-mid">{h.k + 1}</sup>
            </span>
          </span>
        ))}
      </div>
      <figcaption className="mt-[8px] flex justify-between gap-[20px] text-mid">
        <span>the frame's light, as contours</span>
        <span>○ a note, where its column is brightest</span>
      </figcaption>
    </figure>
  )
}
