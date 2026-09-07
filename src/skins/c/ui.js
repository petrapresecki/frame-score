import './skin.css'
import { Core, PARAMS, expose } from '../../core.js'

const core = new Core(document.getElementById('cv'))
core.bands = false                      // no drawn lines: the constraint holds inside the frame too
const frameEl = document.querySelector('.frame')
const headEl = document.querySelector('.head')

// ---- the values are the controls -----------------------------------------
const dials = document.querySelector('.dials')
const puts = PARAMS.map(p => {
  const el = document.createElement('div')
  el.className = 'dial'
  el.tabIndex = 0
  el.setAttribute('role', 'slider')
  el.setAttribute('aria-label', p.label)
  el.innerHTML = `<span class="k">${p.label}</span><span class="v"></span>`
  const v = el.querySelector('.v')

  const put = val => {
    v.textContent = p.k === 'temp'
      ? `${val > 0 ? '+' : ''}${val.toFixed(2)}`
      : `${val.toFixed(2)}${p.unit.trim()}`
    el.setAttribute('aria-valuenow', val.toFixed(2))
  }

  let startX = 0, startV = 0
  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId); startX = e.clientX; startV = core.G[p.k]
  })
  el.addEventListener('pointermove', e => {
    if (!el.hasPointerCapture(e.pointerId)) return
    const span = (p.max - p.min) / 320                 // 320 px sweeps the range
    const raw = startV + (e.clientX - startX) * span
    const val = Math.max(p.min, Math.min(p.max, Math.round(raw / p.step) * p.step))
    core.set(p.k, val); put(val)
  })
  el.addEventListener('keydown', e => {
    const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (!d) return
    e.preventDefault()
    const val = Math.max(p.min, Math.min(p.max, core.G[p.k] + d * p.step * (e.shiftKey ? 10 : 1)))
    core.set(p.k, val); put(val)
  })

  dials.appendChild(el)
  put(p.val)
  return put
})

// ---- sources, as words ----------------------------------------------------
const verbs = document.querySelector('.sources')
core.plates.forEach((pl, i) => {
  const b = document.createElement('button')
  b.className = 'verb small'
  b.textContent = pl.name.split('·')[1].trim()
  b.addEventListener('click', () => core.usePlate(i))
  verbs.appendChild(b)
})

core.fileInput(document.getElementById('file'))
    .dropTarget(frameEl, over => frameEl.classList.toggle('over', over))
document.getElementById('own').addEventListener('click', () => document.getElementById('file').click())
document.getElementById('reset').addEventListener('click', () => {
  core.reset(); PARAMS.forEach((p, i) => puts[i](p.val))
})

// ---- transport ------------------------------------------------------------
const run = document.getElementById('run')
run.addEventListener('click', async () => {
  await core.toggle()
  run.textContent = core.playing ? 'Stop' : 'Play'
  run.setAttribute('aria-pressed', core.playing ? 'true' : 'false')
  frameEl.classList.toggle('playing', core.playing)
  if (core.playing) sweep()
})
function sweep() {
  if (!core.playing) return
  headEl.style.transform = `translateX(${core.progress * frameEl.clientWidth}px)`
  requestAnimationFrame(sweep)
}

// ---- the reading, as a sentence ------------------------------------------
const reading = document.querySelector('.reading')
core.on((A, M) => {
  const pace = M.activity > 0.7 ? 'quick and repeating'
    : M.activity > 0.5 ? 'unhurried' : 'held'
  const room = M.wet > 0.5 ? 'in a large room' : M.wet > 0.35 ? 'in a room' : 'close'
  reading.innerHTML =
    `This frame is <b>${M.modeName}</b>, ${pace}, ${room}. ` +
    `<span>${M.motif.length} notes, ${M.noteLen.toFixed(1)}&thinsp;s each, octave ${M.oct}.</span>`
})

expose(core)
core.render()
