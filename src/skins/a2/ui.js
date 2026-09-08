import './skin.css'
import { Core, PARAMS, expose } from '../../core.js'

const core = new Core(document.getElementById('cv'))
const frameEl = document.getElementById('frame')
const headEl = frameEl.querySelector('.head')
const cueEl = document.getElementById('cue')
const srcEl = document.getElementById('src')

// ---- the accent, sampled but kept off the ground -------------------------
// core.accent() hardcodes saturation and lightness, so a monochrome frame still
// yields a confident colour and a blue frame vanishes into the field. This skin
// samples the hue itself, honours the frame's measured chroma, and forces the
// result at least SEPARATION degrees clear of the ground.
const GROUND_HUE = 229
const SEPARATION = 62

function accentFrom(A) {
  if (!A) return 'hsl(38 100% 61%)'
  let h = A.hue * 30 + 15
  const d = ((h - GROUND_HUE + 540) % 360) - 180
  if (Math.abs(d) < SEPARATION) h = GROUND_HUE + (d >= 0 ? SEPARATION : -SEPARATION)
  const chroma = Math.max(0, Math.min(1, A.colour ?? 0))
  const sat = Math.round(22 + chroma * 76)          // grey frame → grey accent
  const light = Math.round(62 + (1 - chroma) * 14)  // …but still legible on blue
  return `hsl(${((h % 360) + 360) % 360} ${sat}% ${light}%)`
}

// ---- printer points ------------------------------------------------------
// A timing bay sets an integer per channel against a datum. 0–50, 25 nominal.
//
// The four grade ranges are not symmetric about their defaults — contrast runs
// 0.4 to 2.4 from a default of 1 — so a straight linear map would print 15 at
// the datum on that control and 25 on the others. Each side is scaled to its
// own half instead, which is what a timing tape does: the datum is the
// one-light reference, and the points count away from it in both directions.
const POINTS = 50
const DATUM = POINTS / 2

const pointsEl = document.getElementById('points')
const controls = PARAMS.map(p => {
  const toPoints = v => v >= p.val
    ? DATUM + ((v - p.val) / (p.max - p.val)) * DATUM
    : DATUM - ((p.val - v) / (p.val - p.min)) * DATUM
  const fromPoints = n => n >= DATUM
    ? p.val + ((n - DATUM) / DATUM) * (p.max - p.val)
    : p.val - ((DATUM - n) / DATUM) * (p.val - p.min)

  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'pt'
  el.setAttribute('role', 'slider')
  el.setAttribute('aria-label', `${p.label}, printer points`)
  el.setAttribute('aria-valuemin', '0')
  el.setAttribute('aria-valuemax', String(POINTS))
  el.innerHTML =
    `<b class="pt__n"></b>` +
    `<span class="pt__foot"><span class="pt__k">${p.label.toLowerCase()}</span>` +
    `<span class="pt__v"></span></span>`

  const nEl = el.querySelector('.pt__n')
  const vEl = el.querySelector('.pt__v')

  const put = v => {
    const pts = Math.round(toPoints(v))
    nEl.textContent = String(pts).padStart(2, '0')
    vEl.textContent = p.k === 'temp'
      ? `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(2)}`
      : `${v.toFixed(2)}${p.unit.trim()}`
    el.classList.toggle('off', pts !== DATUM)
    el.setAttribute('aria-valuenow', String(pts))
    el.setAttribute('aria-valuetext', `${pts} points, ${vEl.textContent}`)
  }

  // quantise in point space, so the numeral never skips or sticks
  const commitPoints = n => {
    const q = Math.max(0, Math.min(POINTS, Math.round(n)))
    const v = Math.max(p.min, Math.min(p.max, fromPoints(q)))
    core.set(p.k, v)
    put(v)
  }

  // the numeral is the control: drag it sideways
  let from = 0, base = DATUM
  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId)
    from = e.clientX
    base = toPoints(core.G[p.k])
    dismissCue()
    e.preventDefault()
  })
  el.addEventListener('pointermove', e => {
    if (!el.hasPointerCapture(e.pointerId)) return
    // one point per 9 px of travel, so a full sweep is a deliberate gesture
    commitPoints(base + (e.clientX - from) / 9)
  })
  el.addEventListener('keydown', e => {
    const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1
            : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0
    if (d) {
      e.preventDefault()
      commitPoints(toPoints(core.G[p.k]) + d * (e.shiftKey ? 5 : 1))
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      commitPoints(DATUM)
    }
  })
  // it is a <button>, so a bare click would otherwise do nothing at all
  el.addEventListener('click', e => e.preventDefault())

  pointsEl.appendChild(el)
  put(p.val)
  return { p, put }
})

// ---- the tape: the readout, printed on the instrument's face -------------
const HUE = ['red', 'orange', 'amber', 'yellow', 'lime', 'green',
             'teal', 'cyan', 'blue', 'indigo', 'violet', 'magenta']

const ROWS = [
  ['mode',     (A, M) => M.modeName,                                   true],
  ['palette',  (A) => HUE[A.hue] + (A.palette ? ' ↔' : '')],
  ['chords',   (A, M) => M.prog.map(c => HUE[c.hue].slice(0, 3)).join(' ')],
  ['activity', (A, M) => M.activity.toFixed(2)],
  ['restates', (A, M) => `${M.repeats}×`],
  ['note',     (A, M) => `${M.noteLen.toFixed(2)} s`],
  ['attack',   (A, M) => `${M.attack.toFixed(1)} s`],
  ['motif',    (A, M) => `${M.motif.length} notes`],
  ['voices',   (A, M) => `${M.voices}`],
  ['register', (A, M) => `oct ${M.oct}${M.lift ? (M.lift > 0 ? ' +8' : ' −8') : ''}`],
  ['wet',      (A, M) => M.wet.toFixed(2)],
  ['width',    (A, M) => M.width.toFixed(2)],
  ['key light',(A) => A.keyN.toFixed(2)],
  ['detail',   (A) => A.detail.toFixed(2)],
  ['focus',    (A) => A.focus.toFixed(2)],
  ['space',    (A) => A.spaceN.toFixed(2)],
  ['colour',   (A) => A.colour.toFixed(2)],
  ['symmetry', (A) => A.sym.toFixed(2)],
]

const readEl = document.getElementById('read')
const cells = ROWS.map(([label, , loud]) => {
  const dt = document.createElement('dt')
  dt.textContent = label
  const dd = document.createElement('dd')
  if (loud) dd.className = 'mode'
  readEl.append(dt, dd)
  return dd
})

let cool = []
function paintTape(A, M) {
  ROWS.forEach(([, read, loud], i) => {
    const next = String(read(A, M))
    const dd = cells[i]
    if (dd.textContent === next) return
    dd.textContent = next
    if (loud) return
    dd.classList.add('hot')          // a value that moved flashes, then cools
    clearTimeout(cool[i])
    cool[i] = setTimeout(() => dd.classList.remove('hot'), 90)
  })
}

// ---- sources, as numerals ------------------------------------------------
const sourcesEl = document.getElementById('sources')
const fileEl = document.getElementById('file')

const plateBtns = core.plates.map((pl, i) => {
  const b = document.createElement('button')
  b.type = 'button'
  b.textContent = String(i + 1).padStart(2, '0')
  b.title = pl.name
  b.addEventListener('click', () => { core.usePlate(i); dismissCue() })
  sourcesEl.appendChild(b)
  return b
})

const ownBtn = document.createElement('button')
ownBtn.type = 'button'
ownBtn.textContent = 'your frame'
ownBtn.addEventListener('click', () => fileEl.click())
sourcesEl.appendChild(ownBtn)

core.fileInput(fileEl).dropTarget(frameEl, over => frameEl.classList.toggle('over', over))

// ---- the frame is the transport ------------------------------------------
let cueGone = false
function dismissCue() {
  if (cueGone) return
  cueGone = true
  cueEl.classList.add('gone')
}

frameEl.tabIndex = 0
frameEl.addEventListener('click', async () => {
  dismissCue()
  // not core.toggle(): it returns a boolean rather than play()'s promise, so
  // core.playing is still false on the next line and the loop never starts
  if (core.playing) core.stop()
  else await core.play()
  frameEl.classList.toggle('playing', core.playing)
  if (core.playing) sweep()
})
frameEl.addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); frameEl.click() }
})

// ---- the marks -----------------------------------------------------------
// Which part of the picture is sounding, drawn from the same numbers the engine
// plays: the band being read is the chord, and every motif note is struck at the
// column peak it was measured from. Height in the frame is pitch, so a note is
// marked as a rule at its own height — the mark is the mapping, not an effect.
const BANDS = 4
const STEPS = 16 * BANDS

const marksEl = document.getElementById('marks')
const mctx = marksEl.getContext('2d')
let marks = []
let lastStep = -1
let accentCSS = 'hsl(38 100% 61%)'

function fire(step) {
  const { A, M } = core
  if (!A || !M) return
  const bi = Math.floor(step / 16)
  const span = 16 / M.repeats
  const within = (step % 16) % span
  const last = M.motif.length ? M.motif[M.motif.length - 1].slot : -1
  const cols = A.peak.length

  for (const m of M.motif) {
    if (m.slot !== within) continue
    if (bi === 1 && m.slot === last) continue     // the engine drops band two's tail
    const pan = m.pan ?? 0
    const x = (pan + 1) / 2
    const col = Math.round(x * (cols - 1))
    marks.push({ x, y: A.peakY[col], band: bi, vel: m.vel, born: performance.now() })
  }
}

function drawMarks(now) {
  const w = frameEl.clientWidth, h = frameEl.clientHeight
  if (!w || !h) return          // laid out at zero: nothing to draw on yet
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  if (marksEl.width !== Math.round(w * dpr)) {
    marksEl.width = Math.round(w * dpr)
    marksEl.height = Math.round(h * dpr)
  }
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  mctx.clearRect(0, 0, w, h)
  if (!core.playing) return

  // a mark persists a little beyond a very short note, the way a trace persists
  // on a scope — below about half a second nothing registers as having happened
  const life = Math.min(2600, Math.max(480, (core.M?.noteLen ?? 1) * 1000))
  const bw = w / BANDS
  const bi = Math.min(BANDS - 1, Math.floor(core.progress * BANDS))

  // These are drawn on the picture, not on the field, so they cannot use the
  // sampled accent: on a warm frame a warm accent is invisible. Registration
  // marks are neutral, and every one is laid over its own shadow so it reads on
  // a white sky and a black interior alike.
  const ink = (a) => { mctx.globalAlpha = a; mctx.fillStyle = '#fff' }
  const shade = (a) => { mctx.globalAlpha = a; mctx.fillStyle = '#000' }

  // the band being read: its own edges, brightened
  for (const x of [bi * bw, (bi + 1) * bw - 1]) {
    shade(0.28); mctx.fillRect(x - 1, 0, 3, h)
    ink(0.85); mctx.fillRect(x, 0, 1, h)
  }
  ink(0.16)
  mctx.fillRect(bi * bw, 0, bw, 2)
  mctx.fillRect(bi * bw, h - 2, bw, 2)

  marks = marks.filter(m => now - m.born < life)
  for (const m of marks) {
    const t = (now - m.born) / life
    // hold through the attack, then fall away — a squared decay over a 4.5 s
    // note is dim within a few frames of being struck
    const fade = t < 0.16 ? 1 : 1 - (t - 0.16) / 0.84
    const y = Math.round(m.y * h) + 0.5
    const x = m.x * w

    // the rule sits at the height the pitch was taken from, and grows out of
    // the point rather than being drawn all at once
    const reach = bw * 0.5 * Math.min(1, t * 5)
    const tick = 3 + m.vel * 9 * (1 - t)

    shade(fade * 0.35)
    mctx.fillRect(x - reach, y - 1, reach * 2, 3)
    mctx.fillRect(x - 2, y - tick - 1, 4, tick * 2 + 2)

    ink(fade * 0.8)
    mctx.fillRect(x - reach, y, reach * 2, 1)

    // the peak itself, and a tick that opens with the attack so a struck note
    // reads as struck
    ink(fade)
    mctx.fillRect(x - 2, y - 2, 4, 4)
    mctx.fillRect(x - 0.5, y - tick, 1, tick * 2)
  }
  mctx.globalAlpha = 1
}

function sweep(now = performance.now()) {
  if (!core.playing) { drawMarks(now); marks = []; lastStep = -1; return }
  headEl.style.transform = `translateX(${core.progress * frameEl.clientWidth}px)`
  const step = Math.min(STEPS - 1, Math.floor(core.progress * STEPS))
  if (step !== lastStep) { lastStep = step; fire(step) }
  drawMarks(now)
  requestAnimationFrame(sweep)
}

// ---- render --------------------------------------------------------------
core.on((A, M) => {
  accentCSS = accentFrom(A)
  document.documentElement.style.setProperty('--accent', accentCSS)
  // a grade set from anywhere but the numeral itself still shows on the numeral
  controls.forEach(c => c.put(core.G[c.p.k]))
  paintTape(A, M)
  srcEl.textContent = core.sourceName
  const idx = core.plates.findIndex(pl => pl.c === core.src)
  plateBtns.forEach((b, i) => b.setAttribute('aria-current', String(i === idx)))
  ownBtn.setAttribute('aria-current', String(idx === -1))
})

expose(core)
// the marks are driven by requestAnimationFrame, which a headless or hidden
// window throttles to nothing — so they can be stepped by hand to be measured
window.__marks = () => marks.map(m => ({ ...m, age: performance.now() - m.born }))
window.__tick = step => { fire(step); drawMarks(performance.now()); return marks.length }
core.render()
