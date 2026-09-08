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
// desaturated red) was played in phrygian, the darkest mode there is.
//
// FIX 7 — that fix used a hard chroma threshold, and hue itself was binned to
// twelve sectors, and the mode was a lookup. Three cliffs stacked: dragging
// Temperature or Saturation could trip all of them at once and flip the whole
// piece mid-gesture. Now the modes are ranked on one continuous scalar, hue is
// read as an angle, and chroma fades between hue and brightness rather than
// switching between them.

// darkest to brightest. Position on this ladder is what the frame decides.
export const LADDER = ['phrygian', 'aeolian', 'dorian', 'mixolydian', 'lydian']

// where each hue sits on the ladder, 0..1, interpolated around the circle so
// that rotating hue bends the mode instead of snapping it
const HUE_VALENCE = [0.22, 0.74, 0.82, 0.58, 0.50, 0.44, 0.34, 0.28, 0.24, 0.86, 0.90, 0.45]

// how much the frame has to be coloured before its hue is believed at all
const CHROMA_LO = 0.10, CHROMA_HI = 0.55
// and how much it has to agree with itself. A frame lit by neon in six colours
// has a mean hue, but that mean is noise — it swings as soon as anything moves.
const AGREE_LO = 0.25, AGREE_HI = 0.70
// how far past a boundary the scalar must travel before the mode actually
// changes — without this the mode flutters while a slider is being dragged
const HOLD = 0.62

function hueValence(t) {
  const x = (((t % 1) + 1) % 1) * 12 - 0.5      // bin values sit at bin centres
  const i = Math.floor(x + 12), f = x - Math.floor(x)
  const a = HUE_VALENCE[i % 12], b = HUE_VALENCE[(i + 1) % 12]
  return a + (b - a) * (f * f * (3 - 2 * f))        // smoothstep, no corners
}

// with no hue to trust, tone decides — brightness held down by contrast and by
// shadow (FIX 11), not brightness alone.
function lumValence(k) {
  const pts = [[0, 0.14], [0.28, 0.42], [0.50, 0.85], [1, 1.0]]
  for (let i = 1; i < pts.length; i++) {
    if (k <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
      return y0 + (y1 - y0) * ((k - x0) / (x1 - x0))
    }
  }
  return 1
}

const ramp = (v, lo, hi) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)))

export function valenceFor(A) {
  const w = ramp(A.colour, CHROMA_LO, CHROMA_HI) * ramp(A.hueAgree, AGREE_LO, AGREE_HI)
  const v = lumValence(A.tone) * (1 - w) + hueValence(A.hueAngle) * w
  // a deeply saturated frame commits harder to whichever end it is nearer;
  // this is what the old code did with its "phrygian only above 0.55" clause
  return 0.5 + (v - 0.5) * (0.85 + 0.35 * A.colour)
}

let held = null, heldSrc = -1

export function modeFor(A) {
  const v = valenceFor(A)
  const target = v * (LADDER.length - 1)
  if (A.srcId !== heldSrc) { held = null; heldSrc = A.srcId }
  if (held === null || Math.abs(target - held) >= HOLD) held = Math.round(target)
  return LADDER[held]
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
  // kept so the readout can show how near a mode boundary the frame is sitting
  const M = { modeName, scale, valence: valenceFor(A) }

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
  // NOTE — hazeN is defined as 1 - detail, so the third term here is the first
  // term again under another name: this is 0.85*detail + 0.35*keyN, verified
  // to three decimals on ten frames. The "absence of haze" axis does not
  // exist. Left as written until it is decided what should take its place.
  //
  // FIX 9 — re-fitted after detail's and key light's own ranges were
  // corrected. Over fifteen frames the raw sum spans 0.08 to 0.91.
  const raw = 0.55 * A.detail + 0.35 * A.keyN + 0.30 * (1 - A.hazeN)
  M.activityRaw = raw
  M.activity = Math.max(0, Math.min(1, (raw - 0.07) / 0.85))

  M.noteLen = 0.30 + Math.pow(1 - M.activity, 1.2) * 4.2
  M.attack = 1.0 + A.hazeN * 7.0
  // restating inside the band is the loud gesture — reserve it for a frame
  // that is genuinely lively, not merely awake
  M.repeats = M.activity > 0.70 ? 2 : 1
  M.grid = M.activity > 0.70 ? 1 : M.activity > 0.50 ? 2 : 4   // slots
  // never drop an octave off a frame already sitting at the bottom — that is
  // mud, not weight
  M.lift = M.activity > 0.75 ? 12 : (M.activity < 0.25 && M.oct > 0) ? -12 : 0

  // FIX 8 — how concentrated the detail is, which is not how much there is.
  // A frame where one thing dominates an otherwise empty picture gets a
  // thinner bed and gathers toward where that thing sits; a frame of even
  // texture keeps four voices and stays wide.
  //
  // Note this is *concentration*, not distance: Blade Runner is a small figure
  // in a vast space. So it does not touch reverb — space is still spaceN's
  // job, and coupling the two would make a wide shot sound like a close-up.
  M.voices = A.focus > 0.72 ? 2 : A.focus > 0.45 ? 3 : 4
  M.width = 1 - A.focus * 0.65
  M.centre = (A.focusX - 0.5) * 2 * A.focus

  M.prog = buildProgression(A, scale)
  M.motif = buildMotif(A, scale, M)
  return M
}

// FIX 12 — the old test asked whether each band beat the frame average, which
// all four can do while still landing on the same chord. Every black-and-white
// frame in the set came out `red red red red`: one chord, for the whole piece.
// The real question is whether the four bands chose *different* hues.
//
// When they did not, the harmony moves on what does vary — how light each band
// is. A monochrome frame has no colour to be about, but it still has
// composition, and that is what a cinematographer lit.
function buildProgression(A, s) {
  const hues = new Set(A.bands.map(b => b.hue))
  const lums = A.bands.map(b => b.lum)
  const lo = Math.min(...lums), hi = Math.max(...lums)
  const byLum = hi - lo > 0.04

  const mode = hues.size >= 3 ? 'hue' : byLum ? 'lum' : 'cadence'
  A.progFrom = mode

  return A.bands.map((b, i) => {
    let voice
    if (mode === 'hue') voice = HUE2VOICE[b.hue]
    else if (mode === 'lum') voice = Math.round(((b.lum - lo) / (hi - lo)) * (VOICINGS.length - 1))
    else voice = 0
    let deg = VOICINGS[voice].map(ix => s[Math.min(s.length - 1, ix)])
    if (i === 0) deg = [s[0], s[2], s[4], s[7]]                    // home
    if (i === 3 && mode === 'cadence') deg = [s[4], s[6], s[8], s[9]]
    return { deg, oct: b.lum > 0.52 ? 1 : 0, hue: b.hue, colour: b.colour, lum: b.lum, voice }
  })
}

function buildMotif(A, s, M) {
  // when the frame has a subject, the phrase is built from where that subject
  // is — a bright corner should not outrank the thing the shot is about
  const peaks = []
  for (let i = 0; i < A.peak.length; i++) {
    const away = Math.abs(i / (A.peak.length - 1) - A.focusX)
    peaks.push({ i, v: A.peak[i], y: A.peakY[i], rank: A.peak[i] * (1 - A.focus * away) })
  }
  peaks.sort((a, b) => b.rank - a.rank)

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
      // where in the frame the note was found, -1 left to +1 right
      pan: (p.i / Math.max(1, A.peak.length - 1)) * 2 - 1,
    }
  }).sort((a, b) => a.slot - b.slot)
}
