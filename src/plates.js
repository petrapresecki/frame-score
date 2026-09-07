// Placeholder frames, drawn in code. They stand in until a real set is curated;
// for anything published that set must be public domain.

export function makePlates(W, H) {
  const plate = kind => {
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const g = c.getContext('2d')
    if (kind === 0) {                                   // interior, one lamp
      g.fillStyle = '#0a0908'; g.fillRect(0, 0, W, H)
      const rg = g.createRadialGradient(W * 0.68, H * 0.34, 10, W * 0.68, H * 0.34, W * 0.52)
      rg.addColorStop(0, '#f6dfae'); rg.addColorStop(0.18, '#c9974e')
      rg.addColorStop(0.62, '#3a2a17'); rg.addColorStop(1, '#0a0908')
      g.fillStyle = rg; g.fillRect(0, 0, W, H)
      g.fillStyle = 'rgba(6,5,5,.94)'; g.fillRect(W * 0.16, H * 0.20, W * 0.13, H * 0.80)
      g.fillStyle = 'rgba(6,5,5,.72)'; g.fillRect(0, H * 0.86, W, H * 0.14)
    } else if (kind === 1) {                            // wet street, night
      const lg = g.createLinearGradient(0, 0, 0, H)
      lg.addColorStop(0, '#16202c'); lg.addColorStop(0.52, '#0a0f15'); lg.addColorStop(1, '#101821')
      g.fillStyle = lg; g.fillRect(0, 0, W, H)
      g.fillStyle = 'rgba(196,214,232,.90)'; g.fillRect(W * 0.40, H * 0.10, W * 0.014, H * 0.30)
      for (let i = 0; i < 26; i++) {
        const y = H * 0.62 + i * (H * 0.38 / 26)
        g.fillStyle = `rgba(190,210,232,${(0.16 * (1 - i / 26)).toFixed(3)})`
        g.fillRect(W * 0.34 + Math.sin(i * 1.7) * W * 0.02, y, W * 0.14, Math.max(1, H * 0.006))
      }
      g.fillStyle = 'rgba(4,6,9,.96)'; g.fillRect(0, 0, W * 0.20, H); g.fillRect(W * 0.86, 0, W * 0.14, H)
    } else {                                            // exterior, overexposed
      const lg = g.createLinearGradient(0, 0, W, H)
      lg.addColorStop(0, '#f2f0e9'); lg.addColorStop(0.55, '#cfcdc4'); lg.addColorStop(1, '#a9a79e')
      g.fillStyle = lg; g.fillRect(0, 0, W, H)
      g.fillStyle = 'rgba(120,118,110,.5)'; g.fillRect(0, H * 0.70, W, H * 0.02)
      g.fillStyle = 'rgba(96,94,88,.62)'; g.fillRect(W * 0.55, H * 0.36, W * 0.07, H * 0.36)
      g.fillStyle = 'rgba(255,255,255,.42)'; g.fillRect(0, 0, W * 0.42, H)
    }
    return c
  }
  return [
    { c: plate(0), name: 'Plate 01 · interior, one lamp' },
    { c: plate(1), name: 'Plate 02 · wet street, night' },
    { c: plate(2), name: 'Plate 03 · exterior, overexposed' },
  ]
}
