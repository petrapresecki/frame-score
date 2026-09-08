// The Tone.js graph and the sequencer.
//
// Two rules the whole engine obeys:
//   1. Nothing sustains at a fixed pitch and volume — four voices breathe on
//      cycles that never realign, and chords crossfade rather than glide.
//   2. There is no continuous noise source anywhere. Texture is crackle:
//      short impulses, never a sustained hiss.
//   3. The frame is read left to right, so the sound moves left to right. The
//      bed sits where its band sits, notes sound where they were found, and
//      dust falls anywhere. Bass stays centred so a phone speaker keeps it.

import * as Tone from 'tone'
import { ROOT, SLOTS, snap } from './music.js'

const BANDS = 4
const STEPS = SLOTS * BANDS       // 64
export const LOOP = 16            // seconds
const DUR = LOOP / STEPS          // 0.25 s

// cycles chosen so no two ever line up the same way twice
// The melody is panned by where in the frame each note was found. A note rings
// for seconds, so its pan cannot be moved underneath it — instead there are
// five fixed positions and every note is played from the nearest one.
const ZONES = [-0.85, -0.45, 0, 0.45, 0.85]

const BREATH = [
  { rate: 1 / 23, lo: 0.03, hi: 0.55, type: 'sawtooth', vol: -30 },
  { rate: 1 / 27, lo: 0.02, hi: 0.42, type: 'triangle', vol: -24 },
  { rate: 1 / 32, lo: 0.05, hi: 0.60, type: 'triangle', vol: -27 },
  { rate: 1 / 37, lo: 0.02, hi: 0.38, type: 'sawtooth', vol: -31 },
]

export class Engine {
  constructor() {
    this.built = false
    this.playing = false
    this.step = 0
    this.active = 0
    this.curBand = -1
    this.banks = []
    this.zones = []
    this.width = 1
    this.centre = 0
    this.M = null
  }

  build() {
    if (this.built) return
    this.glue = new Tone.Compressor({ threshold: -20, ratio: 2.4, attack: 0.06, release: 0.28 }).toDestination()
    this.reverb = new Tone.Reverb({ decay: 11, preDelay: 0.04, wet: 0.5 }).connect(this.glue)

    // a few cents of tape unsteadiness, on the struck notes only — on sustained
    // voices this reads as a siren
    this.tape = new Tone.Vibrato({ frequency: 0.08, depth: 0.005 }).connect(this.reverb)

    this.chorus = new Tone.Chorus({ frequency: 0.16, delayTime: 7, depth: 0.7, wet: 0.3 }).connect(this.reverb).start()
    this.drive = new Tone.Distortion({ distortion: 0.08, oversample: '2x', wet: 0.5 }).connect(this.chorus)
    this.bedFilt = new Tone.Filter({ type: 'lowpass', frequency: 600, Q: 1 }).connect(this.drive)

    for (const bk of [0, 1]) {
      // each bank carries one band's chord, so the bank is what moves across
      // the field. Its pan is set while it is silent, just before it fades in.
      const pan = new Tone.Panner(0).connect(this.bedFilt)
      const gain = new Tone.Gain(bk === 0 ? 1 : 0).connect(pan)
      const voices = BREATH.map((v, i) => {
        // mute is separate from g because g's gain belongs to the breathing LFO
        const mute = new Tone.Gain(1).connect(gain)
        const g = new Tone.Gain(0).connect(mute)
        const osc = new Tone.Oscillator({ frequency: ROOT, type: v.type, volume: v.vol, detune: (i - 1.5) * 6 }).connect(g).start()
        const lfo = new Tone.LFO({ frequency: v.rate * (bk ? 1.07 : 1), min: v.lo, max: v.hi, phase: i * 67 + bk * 41 }).start()
        lfo.connect(g.gain)
        return { osc, g, lfo, mute }
      })
      this.banks.push({ gain, pan, voices })
    }

    this.bassGain = new Tone.Gain(0.5).connect(this.reverb)
    this.bass = new Tone.Oscillator({ frequency: ROOT / 2, type: 'sine', volume: -14 }).connect(this.bassGain).start()
    this.bassLfo = new Tone.LFO({ frequency: 1 / 41, min: 0.18, max: 0.7, phase: 200 }).start()
    this.bassLfo.connect(this.bassGain.gain)

    this.padPan = new Tone.Panner(0).connect(this.chorus)
    this.padVol = new Tone.Volume(-18).connect(this.padPan)
    this.pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 4, decay: 2, sustain: 0.6, release: 8 },
    }).connect(this.padVol)

    this.delay = new Tone.FeedbackDelay({ delayTime: 0.75, feedback: 0.4, wet: 0.3 }).connect(this.tape)

    // felt hammer: soft strike, no sustain, long decay — one per pan position,
    // with its own hammer noise, so a note keeps the place it was struck in
    this.zones = ZONES.map(base => {
      const pan = new Tone.Panner(base).connect(this.delay)
      const bell = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2.02, modulationIndex: 2.6,
        oscillator: { type: 'sine' }, modulation: { type: 'triangle' },
        envelope: { attack: 0.008, decay: 2.4, sustain: 0, release: 2.6 },
        modulationEnvelope: { attack: 0.004, decay: 0.22, sustain: 0, release: 0.3 },
        volume: -15,
      }).connect(pan)
      const hammer = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 }, volume: -36 }).connect(pan)
      return { base, pan, bell, hammer }
    })

    this.crackleVol = new Tone.Volume(-30).connect(this.reverb)
    // dust lands anywhere, so every impulse gets its own position
    this.cracklePan = new Tone.Panner(0).connect(this.crackleVol)
    this.crackleFilt = new Tone.Filter({ type: 'bandpass', frequency: 2600, Q: 1.1 }).connect(this.cracklePan)
    this.crackle = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.0005, decay: 0.011, sustain: 0 } }).connect(this.crackleFilt)

    Tone.Transport.bpm.value = 60
    Tone.Transport.loop = true
    Tone.Transport.loopStart = 0
    Tone.Transport.loopEnd = LOOP
    Tone.Transport.scheduleRepeat(t => this.tick(t), DUR)
    this.built = true
  }

  chordFreqs(c) {
    const base = ROOT * Math.pow(2, this.M.oct + c.oct)
    return c.deg.map(d => base * 2 * Math.pow(2, d / 12))
  }

  goToBand(bi, time) {
    if (!this.built || !this.M) return
    const c = this.M.prog[bi % BANDS]
    const f = this.chordFreqs(c)
    const other = 1 - this.active
    this.banks[other].voices.forEach((v, i) => { v.osc.frequency.value = f[i % f.length] })
    // the incoming bank is silent right now, so its position can be set
    // outright — no pan ever slides under a sounding voice
    this.banks[other].pan.pan.value = this.bandPan(bi)
    this.banks[other].gain.gain.rampTo(1, 1.6)
    this.banks[this.active].gain.gain.rampTo(0, 1.6)
    this.active = other
    this.bass.frequency.rampTo(f[0] / 4, 1.4)
    if (this.M.padOn && time !== undefined) {
      this.padPan.pan.setValueAtTime(this.bandPan(bi), time)
      this.pad.triggerAttackRelease([f[1], f[2], f[3]], (LOOP / BANDS) * 1.5, time, Math.min(0.6, 0.2 + c.colour * 1.2))
    }
    this.curBand = bi % BANDS
  }

  // dust on the needle, never a sustained hiss
  // Impulses are scattered at random positions in the tick, but one synth
  // cannot be triggered out of chronological order — Tone throws "time must be
  // greater than or equal to the last scheduled time". That threw from inside
  // tick() before the motif loop ran, so every note of the melody was being
  // lost with it. The offsets are sorted before they are played.
  scatter(time, n) {
    if (n <= 0) return
    const at = []
    for (let k = 0; k < n; k++) at.push(Math.random() * DUR)
    at.sort((a, b) => a - b)
    for (const off of at) {
      const t = time + off
      this.cracklePan.pan.setValueAtTime((Math.random() * 2 - 1) * this.width, t)
      this.crackle.triggerAttackRelease(0.01, t, 0.22 + Math.random() * 0.5)
    }
  }

  // the pan a band sits at: band 0 left, band 3 right, narrowed and shifted by
  // what the frame decided
  bandPan(bi) {
    const p = ((bi + 0.5) / BANDS - 0.5) * 2 * this.width + this.centre
    return Math.max(-1, Math.min(1, p))
  }

  zoneFor(pan) {
    let best = this.zones[0], bd = Infinity
    for (const z of this.zones) {
      const d = Math.abs(z.base - pan)
      if (d < bd) { bd = d; best = z }
    }
    return best
  }

  tick(time) {
    const M = this.M
    if (!M) return
    const i = this.step % STEPS
    const bi = Math.floor(i / SLOTS)
    const ls = i % SLOTS
    if (ls === 0) this.goToBand(bi, time)
    this.scatter(time, Math.round(M.grain * 3))

    // the phrase, restated in every band and refitted to that band's chord.
    // At high activity it also restates *within* the band, which is what makes
    // a figure feel played rather than placed.
    const span = SLOTS / M.repeats
    const within = ls % span
    const chord = M.prog[bi].deg
    const lift = (bi === 2 ? 12 : 0) + M.lift
    const soft = bi === 3 ? 0.78 : 1
    const last = M.motif.length ? M.motif[M.motif.length - 1].slot : -1

    for (const m of M.motif) {
      if (m.slot !== within) continue
      if (bi === 1 && m.slot === last) continue          // band two drops the tail
      const semi = snap(m.semi, chord) + lift
      const f = ROOT * Math.pow(2, M.oct) * 4 * Math.pow(2, semi / 12)
      // a note sounds where it was found in the frame, narrowed by width
      const z = this.zoneFor((m.pan ?? 0) * this.width + this.centre)
      z.bell.triggerAttackRelease(f, M.noteLen, time, m.vel * soft)
      z.hammer.triggerAttackRelease(0.05, time, m.vel * 0.6 * soft)
    }
    this.step++
  }

  apply(A, M) {
    this.A = A; this.M = M
    if (!this.built) return
    this.bedFilt.frequency.rampTo(M.cut, 0.35)
    this.bedFilt.Q.rampTo(M.q, 0.35)
    this.reverb.wet.rampTo(M.wet, 0.4)
    this.chorus.wet.rampTo(Math.min(0.75, M.drive * 0.7), 0.4)
    this.drive.wet.rampTo(0.25 + M.drive * 0.5, 0.4)
    this.drive.distortion = 0.05 + A.rangeN * 0.22
    this.delay.feedback.rampTo(Math.min(0.62, M.echo), 0.4)
    this.delay.wet.rampTo(0.18 + A.sym * 0.3, 0.4)
    this.padVol.volume.rampTo(M.padOn ? -24 + A.keyN * 11 : -60, 0.5)
    this.bass.volume.rampTo(-22 + A.spaceN * 12, 0.5)
    this.crackleVol.volume.rampTo(-40 + M.grain * 16, 0.4)
    this.crackleFilt.frequency.rampTo(1800 + M.grain * 2600, 0.4)
    this.pad.set({ envelope: { attack: M.attack, release: M.attack * 1.4 } })

    // how wide the frame plays, and where its weight sits (FIX 8): a
    // concentrated subject gathers the sound, an even field spreads it
    this.width = M.width ?? 1
    this.centre = M.centre ?? 0
    for (const z of this.zones) {
      z.bell.set({ envelope: { decay: M.noteLen, release: M.noteLen * 1.3 } })
      z.pan.pan.rampTo(Math.max(-1, Math.min(1, z.base * this.width + this.centre)), 0.4)
    }
    // a frame with one thing in it is not played by a four-part choir
    const want = M.voices ?? BREATH.length
    for (const bank of this.banks) {
      bank.voices.forEach((v, i) => v.mute.gain.rampTo(i < want ? 1 : 0, 1.5))
    }
    if (this.curBand >= 0) this.banks[this.active].pan.pan.rampTo(this.bandPan(this.curBand), 0.4)
    if (this.curBand >= 0) {
      const f = this.chordFreqs(M.prog[this.curBand])
      this.banks[this.active].voices.forEach((v, i) => v.osc.frequency.rampTo(f[i % f.length], 1.2))
      this.bass.frequency.rampTo(f[0] / 4, 1.2)
    }
  }

  async start() {
    await Tone.start()
    this.build()
    this.apply(this.A, this.M)
    this.step = 0
    Tone.Transport.position = 0
    Tone.Transport.start()
    this.playing = true
  }

  stop() {
    Tone.Transport.stop()
    this.pad?.releaseAll()
    for (const z of this.zones) z.bell.releaseAll()
    this.playing = false
  }

  get progress() { return Tone.Transport.progress }
}
