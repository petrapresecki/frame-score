// Words for what music.js decided. Nothing here changes a decision — it only
// names one, so the page can say "G7" where the engine says [5, 9, 12, 15].

import { ROOT } from './music.js'

// semitones above C of the engine's root (D2 = 73.42 Hz)
const ROOT_PC = Math.round(12 * Math.log2(ROOT / 16.3516)) % 12
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']

// triads first, then what may sit on top of them
const TRIADS = [['', [4, 7]], ['m', [3, 7]], ['dim', [3, 6]], ['sus4', [5, 7]], ['sus2', [2, 7]], ['+', [4, 8]]]
const EXTRA = { 10: '7', 11: 'maj7', 9: '6', 2: 'add9', 5: 'add11' }

// A voicing is semitones above the root. Try every note in it as the chord's
// root and keep the reading that needs the fewest extensions; the lowest note,
// if it is not that root, is written as a slash bass.
export function chordName(deg) {
  const pcs = [...new Set(deg.map(d => (ROOT_PC + d) % 12))]
  const bass = (ROOT_PC + Math.min(...deg)) % 12
  let best = null
  for (const r of pcs) {
    const rel = pcs.map(p => (p - r + 12) % 12)
    for (const [q, tri] of TRIADS) {
      if (!tri.every(t => rel.includes(t))) continue
      const rest = rel.filter(x => x !== 0 && !tri.includes(x))
      if (!rest.every(x => EXTRA[x])) continue
      const score = rest.length + (r === bass ? 0 : 0.5)
      if (!best || score < best.score) {
        let ext = rest.map(x => EXTRA[x]).join('')
        let qq = q
        if (q === 'm' && ext === 'maj7') ext = '(maj7)'
        // a diminished triad under a minor seventh is half-diminished, not dim7
        if (q === 'dim' && ext === '7') { qq = 'm'; ext = '7♭5' }
        best = { score, name: NOTE[r] + qq + ext + (r === bass ? '' : `/${NOTE[bass]}`) }
      }
    }
  }
  return best ? best.name : NOTE[bass]
}

export const keyName = M => `${NOTE[ROOT_PC]} ${M.modeName}`

// activity is the axis between hypnotic and lively (music.js, FIX 6); this is
// only a word for where on it the frame sits
export const tempoWord = a => a < 0.25 ? 'largo' : a < 0.45 ? 'adagio' : a < 0.62 ? 'andante' : a < 0.8 ? 'moderato' : 'allegro'

// "Plate 01 · interior, one lamp" → "plate 01"; "after-hours.jpg" → "after-hours"
export function shortName(name = '') {
  return name.split(' · ')[0].replace(/\.(jpe?g|png|webp|gif|avif)$/i, '').toLowerCase()
}
