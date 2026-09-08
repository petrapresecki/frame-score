// Reads a graded frame into measurements.
//
// Every value is stretched against the range real photographs actually occupy.
// Untouched, photographs all average out to mid-grey and every frame produces
// the same numbers.

import { gradePixels } from './grade.js'

export const AW = 160, AH = 90, COLS = 32, BANDS = 4

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
const norm = (v, lo, hi) => clamp01((v - lo) / (hi - lo))
const TAU = Math.PI * 2

// continuous hue in [0,1), or -1 when there is not enough chroma to have one.
// The twelve bins are still taken from this, but the mode reads the angle
// directly — binning hue is a cliff, and dragging Temperature falls off it.
function hueOf(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn
  if (c <= 0.02) return -1
  let h
  if (mx === r) h = ((g - b) / c + 6) % 6
  else if (mx === g) h = (b - r) / c + 2
  else h = (r - g) / c + 4
  return h / 6
}

// hysteresis in music.js has to forget everything when the frame changes,
// otherwise the mode a new frame lands on depends on the frame before it
let lastSrc = null, srcSeq = 0, paletteHeld = false

// FIX 10 — a screenshot taken from video carries black bars, and they are not
// part of the picture. Left in, they land in bands 0 and 3 and inflate shadow,
// contrast and the progression. Bars are detected on the ungraded pixels, so
// lifting exposure cannot hide them, and only trimmed when they appear on
// *both* opposite sides: letterboxing is symmetric, a dark edge in the
// composition is not, and The Third Man must keep its shadows.
const BAR_LUM = 0.045
const BAR_MAX = 0.28

function isBar(d, i, n, stride) {
  for (let k = 0; k < n; k++) {
    const o = (i + k * stride) * 4
    if ((0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]) / 255 > BAR_LUM * 255 / 255) {
      if ((0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]) / 255 > BAR_LUM) return false
    }
  }
  return true
}

function findBars(d) {
  const maxY = (AH * BAR_MAX) | 0, maxX = (AW * BAR_MAX) | 0
  let t = 0, b = 0, l = 0, r = 0
  while (t < maxY && isBar(d, t * AW, AW, 1)) t++
  while (b < maxY && isBar(d, (AH - 1 - b) * AW, AW, 1)) b++
  while (l < maxX && isBar(d, l, AH, AW)) l++
  while (r < maxX && isBar(d, AW - 1 - r, AH, AW)) r++
  const sym = (a, z) => (a >= 2 && z >= 2 && Math.abs(a - z) <= Math.max(1, Math.round((a + z) * 0.3))) ? Math.min(a, z) : 0
  return { y: sym(t, b), x: sym(l, r) }
}

export function analyse(src, G, ctx) {
  // a new frame forgets everything held across renders — otherwise which mode
  // a frame lands on depends on the frame that came before it
  if (src !== lastSrc) { lastSrc = src; srcSeq++; paletteHeld = false }

  ctx.clearRect(0, 0, AW, AH)
  ctx.drawImage(src, 0, 0, AW, AH)
  let img = ctx.getImageData(0, 0, AW, AH)

  const bar = findBars(img.data)
  if (bar.x || bar.y) {
    const sw0 = src.width || AW, sh0 = src.height || AH
    ctx.clearRect(0, 0, AW, AH)
    ctx.drawImage(src,
      sw0 * bar.x / AW, sh0 * bar.y / AH,
      sw0 * (AW - 2 * bar.x) / AW, sh0 * (AH - 2 * bar.y) / AH,
      0, 0, AW, AH)
    img = ctx.getImageData(0, 0, AW, AH)
  }
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
  let hx = 0, hy = 0, chromaSum = 0, hx2 = 0, hy2 = 0

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

      const hu = hueOf(r, g, b)
      // weight by chroma alone: a large pale sky should not outvote a small
      // saturated sign just because it is bright and everywhere
      if (hu >= 0) {
        const hb = Math.min(11, (hu * 12) | 0)
        hue[hb] += chroma; bandHue[bi][hb] += chroma
        hx += chroma * Math.cos(TAU * hu); hy += chroma * Math.sin(TAU * hu)
        // and again at double the angle — opposed hues cancel in the first
        // moment but reinforce in this one (FIX 13)
        hx2 += chroma * Math.cos(2 * TAU * hu); hy2 += chroma * Math.sin(2 * TAU * hu)
        chromaSum += chroma
      }
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
  // which made the single most important axis useless. See FIX 9 for the
  // range this actually occupies once more than three frames are measured.
  let edge = 0, cnt = 0
  // FIX 8 — the same pass also asks *how concentrated* the detail is, not just
  // how much there is. A lone figure in fog and a forest can carry the same
  // amount of edge; only one of them is a subject. Centre-versus-edge
  // sharpness was tried first and measures vignetting, not subject: a wide
  // landscape scored higher than a figure alone in frame.
  const GB = 256
  const gHist = new Float32Array(GB), gCount = new Float32Array(GB)
  let gcx = 0, gcy = 0
  for (let y = 1; y < AH - 1; y++) {
    for (let x = 1; x < AW - 1; x++) {
      const c0 = y * AW + x
      const gx = lum[c0 + 1] - lum[c0 - 1]
      const gy = lum[c0 + AW] - lum[c0 - AW]
      const g = Math.sqrt(gx * gx + gy * gy)
      edge += g; cnt++
      const gb = Math.min(GB - 1, (g * (GB - 1)) | 0)
      gHist[gb] += g; gCount[gb]++
      gcx += g * (x / (AW - 1)); gcy += g * (y / (AH - 1))
    }
  }
  const edgeRaw = edge / cnt

  // share of all edge energy held by the busiest tenth of the picture.
  // Even texture sits near 0.10; one thing against nothing approaches 1.
  let want = cnt * 0.10, acc = 0, pix = 0
  for (let k = GB - 1; k >= 0 && pix < want; k--) {
    const take = Math.min(gCount[k], want - pix)
    if (gCount[k] > 0) acc += gHist[k] * (take / gCount[k])
    pix += take
  }
  const focusRaw = edge > 0 ? acc / edge : 0.10

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

  // chroma-weighted circular mean: where the frame sits on the colour wheel,
  // as an angle rather than one of twelve buckets. Its length says how much
  // the frame agrees with itself — a monochrome frame is near 1.
  const hueLen = chromaSum > 0 ? Math.sqrt(hx * hx + hy * hy) / chromaSum : 0
  let hueAngle = chromaSum > 0 ? ((Math.atan2(hy, hx) / TAU) + 1) % 1 : 0

  // FIX 13 — a two-colour scheme and a frame full of scattered neon both have
  // a meaningless mean hue, and FIX 7's agreement gate threw both away. But
  // they are not the same thing: teal against orange is the most deliberate
  // colour decision in modern cinema, and it was being read as "no colour".
  //
  // Doubling the angle folds opposites onto each other, so a two-colour frame
  // that disagrees with itself at 0.18 agrees along its axis at close to 1.
  // The louder end of that axis is the hue the frame is actually about.
  const axialLen = chromaSum > 0 ? Math.sqrt(hx2 * hx2 + hy2 * hy2) / chromaSum : 0
  // and the flag itself gets hysteresis, for the same reason the mode has it:
  // flipping it mid-drag swaps the hue by half the wheel in one step
  const wants = paletteHeld
    ? axialLen > hueLen + 0.15 && axialLen > 0.38
    : axialLen > hueLen + 0.30 && axialLen > 0.45
  let palette = false
  if (wants) {
    const axis = ((Math.atan2(hy2, hx2) / 2 / TAU) + 1) % 1
    let near = 0, far = 0
    for (let h = 0; h < 12; h++) {
      const d = Math.abs((((h + 0.5) / 12 - axis) % 1 + 1.5) % 1 - 0.5)
      ;(d < 0.25 ? (near += hue[h]) : (far += hue[h]))
    }
    hueAngle = near >= far ? axis : (axis + 0.5) % 1
    palette = true
  }
  paletteHeld = palette
  const hueAgree = palette ? axialLen : hueLen

  const A = {
    srcId: srcSeq,
    trimmed: bar,
    hueAngle, hueAgree, hueAxial: axialLen, palette,
    key: p50, low: p05, high: p95, range: p95 - p05,
    shadow: shadow / n,
    colourRaw, edgeRaw,
    // FIX 9 — every one of these was fitted against three frames, and every one
    // was wrong at an end. Re-fitted twice: first over ten frames, then over
    // fifteen once a high-key frame (Fargo, snow) and a chiaroscuro one (The
    // Third Man, almost all shadow) arrived and pinned both extremes at once.
    // Fargo alone was clipping key light, detail and focus simultaneously.
    colour: norm(colourRaw, 0.015, 0.39),
    detail: norm(edgeRaw, 0.028, 0.15),
    focusRaw,
    focus: norm(focusRaw, 0.24, 0.80),
    focusX: edge > 0 ? gcx / edge : 0.5,
    focusY: edge > 0 ? gcy / edge : 0.5,
    sym, hue: dom, bands, peak, peakY,
  }
  A.keyN = norm(p50, 0.02, 0.80)
  A.rangeN = norm(p95 - p05, 0.10, 0.95)
  A.hazeN = 1 - A.detail
  A.shadowN = norm(A.shadow, 0.00, 0.90)

  // FIX 11 — when a frame has no colour, brightness alone was deciding its
  // mood, and brightness says nothing about mood. Persona (an anguished
  // close-up) and Kwaidan (a ghost story) both read near the bright end of the
  // ladder purely because they are mid-key. Contrast and shadow are what carry
  // mood in a monochrome frame: chiaroscuro is heavy however bright its
  // highlights are, and an even, luminous frame is light however grey it is.
  // multiplicative, not subtractive: subtracting drove a third of the frames
  // below zero and they all floored together at the same value
  A.tone = A.keyN * (1 - 0.50 * A.rangeN) * (1 - 0.55 * A.shadowN)

  // FIX 4 — space used to come only from shadow area, so a luminous fog came
  // out dry and close. Haze makes a room too.
  A.spaceN = Math.max(A.shadowN, A.hazeN * 0.92)

  return A
}
