// The accent, sampled but kept off the ground.
//
// core.accent() hardcodes saturation and lightness, so a monochrome frame still
// yields a confident colour and a blue frame vanishes into the field. This skin
// samples the hue itself, honours the frame's measured chroma, and forces the
// result at least SEPARATION degrees clear of the ground.
const GROUND_HUE = 229
const SEPARATION = 62

export function accentFrom(A) {
  if (!A) return 'hsl(38 100% 61%)'
  let h = A.hue * 30 + 15
  const d = ((h - GROUND_HUE + 540) % 360) - 180
  if (Math.abs(d) < SEPARATION) h = GROUND_HUE + (d >= 0 ? SEPARATION : -SEPARATION)
  const chroma = Math.max(0, Math.min(1, A.colour ?? 0))
  const sat = Math.round(22 + chroma * 76)          // grey frame → grey accent
  const light = Math.round(62 + (1 - chroma) * 14)  // …but still legible on blue
  return `hsl(${((h % 360) + 360) % 360} ${sat}% ${light}%)`
}
