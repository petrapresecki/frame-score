// Turns measurements into musical decisions.
//
// Nothing here is free-running: every pitch comes from a mode, every chord from
// a hand-written voicing stacked inside that mode. The frame chooses and steers;
// it does not get to invent intervals.

export const SLOTS = 16          // slots per band (0.25 s each at 60 BPM)
export const ROOT = 73.42        // D2

export const MODES = {
  phrygian:   [0, 1, 3, 5, 7, 8, 10, 12, 13, 15],
  mixolydian: [0, 2, 4, 7, 9, 10, 12, 14, 16, 19],
  dorian:     [0, 2, 3, 5, 7, 9, 10, 12, 14, 15],
  aeolian:    [0, 2, 3, 5, 7, 8, 10, 12, 14, 15],
  lydian:     [0, 2, 4, 6, 7, 9, 11, 12, 14, 16],
}

export const HUENAME = ['red','orange','yellow','lime','green','sea','cyan','azure','blue','violet','magenta','rose']

// Voicings as indices into the mode, so every one of them is consonant.
const VOICINGS = [[0,2,4,7],[1,3,5,7],[2,4,6,8],[0,3,5,7],[3,5,7,9]]
const HUE2VOICE = [0,3,3,2,2,4,4,1,1,0,0,0]

// FIX 2 — mode used to come from hue alone, so pastel pink (which is just
// desaturated red) was played in phrygian, the darkest mode there is. Below a
// real chroma threshold the frame has no hue worth trusting, so brightness
// decides instead.
const CHROMA_FLOOR = 0.38

export function modeFor(A) {
  if (A.colour < CHROMA_FLOOR) {
    if (A.keyN >= 0.50) return 'lydian'
    if (A.keyN >= 0.28) return 'mixolydian'
    return 'aeolian'
  }
  const h = A.hue
  if (h === 0 || h === 11) return A.colour > 0.55 ? 'phrygian' : 'aeolian'
  if (h === 1 || h === 2) return 'mixolydian'
  if (h >= 3 && h <= 5) return 'dorian'
  if (h >= 6 && h <= 8) return 'aeolian'
  return 'lydian'
}

// pull a note onto the nearest tone of the chord underneath it
export function snap(semi, chord) {
  const set = new Set(chord.map(d => ((d % 12) + 12) % 12))
  for (let off = 0; off <= 6; off++) {
    if (set.has((((semi - off) % 12) + 12) % 12)) return semi - off
    if (set.has((((semi + off) % 12) + 12) % 12)) return semi + off
  }
  return semi
}

export function decide(A) {
  const modeName = modeFor(A)
  const scale = MODES[modeName]
  const M = { modeName, scale }

  // FIX 5 — register used to follow brightness alone, so a luminous haze sat up
  // in the bells. Haze now pulls it back down where it belongs.
  const octBasis = A.keyN - A.hazeN * 0.45
  M.oct = octBasis < 0.26 ? 0 : octBasis < 0.58 ? 1 : 2

  M.wet = Math.min(0.66, 0.18 + A.spaceN * 0.48)
  M.cut = 180 + A.keyN * 2400 + A.rangeN * 1400
  M.q = 0.6 + A.rangeN * 1.4
  M.echo = 0.18 + A.sym * 0.45
  M.drive = A.colour
  M.grain = A.detail
  M.padOn = A.colour > 0.16

  // FIX 6 — the activity axis. The engine used to vary space, harmony and
  // density but never *rate*, so "chill" and "lively" both came out slow and
  // only differed in how many notes there were. Density is not liveliness.
  // measured across real stills, the raw sum only spans about 0.12-0.68, so it
  // is stretched — otherwise the liveliest frame never crosses a threshold
  const raw = 0.55 * A.detail + 0.35 * A.keyN + 0.30 * (1 - A.hazeN)
  M.activityRaw = raw
  M.activity = Math.max(0, Math.min(1, (raw - 0.12) / 0.62))

  M.noteLen = 0.30 + Math.pow(1 - M.activity, 1.2) * 4.2
  M.attack = 1.0 + A.hazeN * 7.0
  // restating inside the band is the loud gesture — reserve it for a frame
  // that is genuinely lively, not merely awake
  M.repeats = M.activity > 0.70 ? 2 : 1
  M.grid = M.activity > 0.70 ? 1 : M.activity > 0.50 ? 2 : 4   // slots
  // never drop an octave off a frame already sitting at the bottom — that is
  // mud, not weight
  M.lift = M.activity > 0.75 ? 12 : (M.activity < 0.25 && M.oct > 0) ? -12 : 0

  M.prog = buildProgression(A, scale)
  M.motif = buildMotif(A, scale, M)
  return M
}

function buildProgression(A, s) {
  // A frame with genuinely distinct bands earns all four chords. A frame that
  // is one colour throughout keeps the cadence, because there is nothing else
  // for the harmony to be about.
  const distinct = A.bands.filter(b => b.distinct).length >= 3
  return A.bands.map((b, i) => {
    let deg = VOICINGS[HUE2VOICE[b.hue]].map(ix => s[Math.min(s.length - 1, ix)])
    if (i === 0) deg = [s[0], s[2], s[4], s[7]]                 // home
    if (i === 3 && !distinct) deg = [s[4], s[6], s[8], s[9]]    // cadence
    return { deg, oct: b.lum > 0.52 ? 1 : 0, hue: b.hue, colour: b.colour, lum: b.lum }
  })
}

function buildMotif(A, s, M) {
  const peaks = []
  for (let i = 0; i < A.peak.length; i++) peaks.push({ i, v: A.peak[i], y: A.peakY[i] })
  peaks.sort((a, b) => b.v - a.v)

  const count = Math.max(2, Math.min(5, Math.round(2 + A.detail * 3.4)))
  const keep = peaks.slice(0, count).filter(p => p.v > A.low + A.range * 0.18)
  keep.sort((a, b) => a.i - b.i)

  const span = SLOTS / M.repeats
  const used = new Set()
  return keep.map(p => {
    // position within one statement, quantised to the activity's grid
    let slot = Math.round((p.i / A.peak.length) * span / M.grid) * M.grid
    slot = Math.min(span - 1, slot)
    while (used.has(slot)) slot = (slot + M.grid) % span
    used.add(slot)
    const yy = 1 - p.y                                  // high in frame = high pitch
    return {
      slot,
      semi: s[Math.min(s.length - 1, Math.floor(yy * s.length))],
      vel: Math.min(0.9, 0.18 + ((p.v - A.low) / Math.max(0.15, A.range)) * 0.5),
    }
  }).sort((a, b) => a.slot - b.slot)
}
