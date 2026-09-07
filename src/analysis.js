// Reads a graded frame into measurements.
//
// Every value is stretched against the range real photographs actually occupy.
// Untouched, photographs all average out to mid-grey and every frame produces
// the same numbers.

import { gradePixels } from './grade.js'

export const AW = 160, AH = 90, COLS = 32, BANDS = 4

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
const norm = (v, lo, hi) => clamp01((v - lo) / (hi - lo))

function hueBin(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn
  if (c <= 0.02) return -1
  let h
  if (mx === r) h = ((g - b) / c + 6) % 6
  else if (mx === g) h = (b - r) / c + 2
  else h = (r - g) / c + 4
  return Math.min(11, ((h / 6) * 12) | 0)
}

export function analyse(src, G, ctx) {
  ctx.clearRect(0, 0, AW, AH)
  ctx.drawImage(src, 0, 0, AW, AH)
  const img = ctx.getImageData(0, 0, AW, AH)
  gradePixels(img.data, G)
  const d = img.data, n = AW * AH

  const lum = new Float32Array(n)
  const hist = new Float32Array(64)
  const hue = new Float32Array(12)
  const bandHue = Array.from({ length: BANDS }, () => new Float32Array(12))
  const bandLum = new Float32Array(BANDS)
  const bandChroma = new Float32Array(BANDS)
  const bandN = new Float32Array(BANDS)
  const bw = AW / BANDS

  let shadow = 0, rgS = 0, rgS2 = 0, ybS = 0, ybS2 = 0

  for (let y = 0; y < AH; y++) {
    for (let x = 0; x < AW; x++) {
      const i = y * AW + x, o = i * 4
      const r = d[o] / 255, g = d[o + 1] / 255, b = d[o + 2] / 255
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
      lum[i] = l
      hist[Math.min(63, (l * 64) | 0)]++
      if (l < 0.18) shadow++

      const rg = r - g, yb = 0.5 * (r + g) - b
      rgS += rg; rgS2 += rg * rg; ybS += yb; ybS2 += yb * yb

      const bi = Math.min(BANDS - 1, (x / bw) | 0)
      bandLum[bi] += l; bandN[bi]++
      const chroma = Math.max(r, g, b) - Math.min(r, g, b)
      bandChroma[bi] += chroma

      const hb = hueBin(r, g, b)
      // weight by chroma alone: a large pale sky should not outvote a small
      // saturated sign just because it is bright and everywhere
      if (hb >= 0) { hue[hb] += chroma; bandHue[bi][hb] += chroma }
    }
  }

  const pct = p => {
    const t = n * p
    let acc = 0
    for (let k = 0; k < 64; k++) { acc += hist[k]; if (acc >= t) return k / 63 }
    return 1
  }
  const p05 = pct(0.05), p50 = pct(0.5), p95 = pct(0.95)

  const rgM = rgS / n, ybM = ybS / n
  const rgSd = Math.sqrt(Math.max(0, rgS2 / n - rgM * rgM))
  const ybSd = Math.sqrt(Math.max(0, ybS2 / n - ybM * ybM))
  const colourRaw = Math.sqrt(rgSd * rgSd + ybSd * ybSd) + 0.3 * Math.sqrt(rgM * rgM + ybM * ybM)

  // detail: mean gradient magnitude.
  // FIX 1 — the old ceiling of 0.10 clipped two of three real frames at 1.00,
  // which made the single most important axis useless. Measured range across
  // real stills is roughly 0.01 (hazy) to 0.30 (dense forest).
  let edge = 0, cnt = 0
  for (let y = 1; y < AH - 1; y++) {
    for (let x = 1; x < AW - 1; x++) {
      const c0 = y * AW + x
      const gx = lum[c0 + 1] - lum[c0 - 1]
      const gy = lum[c0 + AW] - lum[c0 - AW]
      edge += Math.sqrt(gx * gx + gy * gy); cnt++
    }
  }
  const edgeRaw = edge / cnt

  // per-column brightest point: value and vertical position
  const per = AW / COLS
  const peak = new Float32Array(COLS), peakY = new Float32Array(COLS)
  for (let x = 0; x < COLS; x++) {
    let best = -1, bestY = 0
    for (let xx = (x * per) | 0; xx < (((x + 1) * per) | 0); xx++) {
      for (let y = 0; y < AH; y++) {
        const v = lum[y * AW + xx]
        if (v > best) { best = v; bestY = y }
      }
    }
    peak[x] = best; peakY[x] = bestY / (AH - 1)
  }

  let symErr = 0
  for (let x = 0; x < COLS / 2; x++) symErr += Math.abs(peak[x] - peak[COLS - 1 - x])
  const sym = 1 - Math.min(1, (symErr / (COLS / 2)) * 3)

  // FIX 3 — each band takes the hue that makes it *different*, not the hue it
  // shares with the whole frame. Without this, one large background collapses
  // every band onto the same colour and the progression disappears.
  const total = hue.reduce((a, b) => a + b, 0) || 1
  const bands = []
  for (let bi = 0; bi < BANDS; bi++) {
    const bt = bandHue[bi].reduce((a, b) => a + b, 0) || 1
    let bestBin = 0, bestExcess = -Infinity, domBin = 0
    for (let h = 0; h < 12; h++) {
      const excess = bandHue[bi][h] / bt - hue[h] / total
      if (excess > bestExcess) { bestExcess = excess; bestBin = h }
      if (bandHue[bi][h] > bandHue[bi][domBin]) domBin = h
    }
    bands.push({
      hue: bestExcess > 0.006 ? bestBin : domBin,
      dominant: domBin,
      distinct: bestExcess > 0.006,
      lum: bandLum[bi] / bandN[bi],
      colour: bandChroma[bi] / bandN[bi],
    })
  }

  let dom = 0
  for (let h = 1; h < 12; h++) if (hue[h] > hue[dom]) dom = h

  const A = {
    key: p50, low: p05, high: p95, range: p95 - p05,
    shadow: shadow / n,
    colourRaw, edgeRaw,
    colour: norm(colourRaw, 0.05, 0.42),
    detail: norm(edgeRaw, 0.008, 0.30),
    sym, hue: dom, bands, peak, peakY,
  }
  A.keyN = norm(p50, 0.10, 0.70)
  A.rangeN = norm(p95 - p05, 0.30, 0.95)
  A.hazeN = 1 - A.detail
  A.shadowN = norm(A.shadow, 0.02, 0.55)

  // FIX 4 — space used to come only from shadow area, so a luminous fog came
  // out dry and close. Haze makes a room too.
  A.spaceN = Math.max(A.shadowN, A.hazeN * 0.92)

  return A
}
