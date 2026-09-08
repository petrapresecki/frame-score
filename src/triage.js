// Which of these is a frame, and which is a poster.
//
// TMDB has no flag for it: key art — the cast cut out and composited against a
// split-toned background — sits in the same backdrops array as photography from
// the film. It reads as the most musical thing in the reel, because a designer
// built it out of two opposed colours on purpose, and that is exactly why it
// must not lead. A poster would give the strongest progression in the piece and
// mean nothing.
//
// The measurement that separates them: real cinematography is lit, so a frame
// tends to hold one colour of light across its width, or drift. Key art is
// *both* violently saturated and violently split — the two together are rare in
// a photograph and near-universal in a composite.
//
// This only reorders the reel. Nothing is hidden, because the judgement is a
// heuristic and the eye at the gate is the authority.

const W = 64, H = 36, BANDS = 4

// circular distance in degrees
const arc = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }

function bands(img) {
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0, W, H)
  const d = g.getImageData(0, 0, W, H).data
  const out = []

  for (let b = 0; b < BANDS; b++) {
    // hue is circular, so it is averaged as a vector — a mean of degrees puts
    // the average of red and violet at cyan
    let x = 0, y = 0, sat = 0, n = 0
    for (let py = 0; py < H; py++) {
      for (let px = (b * W) / BANDS; px < ((b + 1) * W) / BANDS; px++) {
        const i = (py * W + px) * 4
        const r = d[i] / 255, gg = d[i + 1] / 255, bb = d[i + 2] / 255
        const mx = Math.max(r, gg, bb), mn = Math.min(r, gg, bb)
        const s = mx === 0 ? 0 : (mx - mn) / mx
        let h = 0
        if (mx !== mn) {
          if (mx === r) h = 60 * (((gg - bb) / (mx - mn)) % 6)
          else if (mx === gg) h = 60 * ((bb - r) / (mx - mn) + 2)
          else h = 60 * ((r - gg) / (mx - mn) + 4)
        }
        h = (h + 360) % 360
        // weight each pixel's hue by its own saturation: a grey pixel has no
        // meaningful hue and must not drag the average
        x += Math.cos((h * Math.PI) / 180) * s
        y += Math.sin((h * Math.PI) / 180) * s
        sat += s; n++
      }
    }
    const h = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
    out.push({ hue: h, sat: sat / n })
  }
  return out
}

// 0 = certainly a frame, 1 = certainly key art
export function keyArtScore(img) {
  const b = bands(img)
  let spread = 0
  for (let i = 0; i < b.length; i++)
    for (let j = i + 1; j < b.length; j++) spread = Math.max(spread, arc(b[i].hue, b[j].hue))
  const sat = b.reduce((a, x) => a + x.sat, 0) / b.length

  // 90° apart is a strong split; below about 45° is ordinary drift. Chroma
  // below 0.35 is photographic even when the hue swings, which protects a
  // genuinely bicolour shot lit with two sources.
  const split = Math.min(1, Math.max(0, (spread - 45) / 45))
  const punch = Math.min(1, Math.max(0, (sat - 0.35) / 0.3))
  return split * punch
}

function load(url) {
  return new Promise(res => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = url
  })
}

// Frames first, likely key art last, each group keeping the order TMDB gave.
// Runs on the w300 copies — a few hundred kilobytes for a whole reel, and four
// band averages do not need more resolution than that.
export async function triage(shots) {
  const scored = await Promise.all(shots.map(async s => {
    const img = await load(s.probe)
    return { ...s, art: img ? keyArtScore(img) : 0 }
  }))
  return scored
    .map((s, i) => ({ ...s, i }))
    .sort((a, b) => (a.art > 0.5) - (b.art > 0.5) || a.i - b.i)
    .map((s, n) => ({ ...s, n }))
}
