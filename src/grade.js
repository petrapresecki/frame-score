// The four grade controls, as pixel maths.
// One implementation, used for both the displayed frame and the analysed
// downsample — so what you see really is what gets heard.

export const PARAMS = [
  { k: 'exposure', label: 'Exposure',    min: -1.4, max: 1.4, step: 0.02, val: 0, unit: ' EV' },
  { k: 'contrast', label: 'Contrast',    min:  0.4, max: 2.4, step: 0.02, val: 1, unit: '×'  },
  { k: 'temp',     label: 'Temperature', min: -1,   max: 1,   step: 0.02, val: 0, unit: ''   },
  { k: 'sat',      label: 'Saturation',  min:  0,   max: 2,   step: 0.02, val: 1, unit: '×'  },
]

export function gradePixels(d, G) {
  const gain = Math.pow(2, G.exposure)
  const { contrast: c, temp: t, sat: s } = G
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] / 255) * gain
    let g = (d[i + 1] / 255) * gain
    let b = (d[i + 2] / 255) * gain
    r = (r - 0.5) * c + 0.5; g = (g - 0.5) * c + 0.5; b = (b - 0.5) * c + 0.5
    r += t * 0.10; b -= t * 0.10; g += t * 0.02
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
    r = l + (r - l) * s; g = l + (g - l) * s; b = l + (b - l) * s
    d[i]     = r < 0 ? 0 : r > 1 ? 255 : r * 255
    d[i + 1] = g < 0 ? 0 : g > 1 ? 255 : g * 255
    d[i + 2] = b < 0 ? 0 : b > 1 ? 255 : b * 255
  }
  return d
}
