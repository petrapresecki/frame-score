import './skin.css'
import { Core, PARAMS, expose } from '../../core.js'

const core = new Core(document.getElementById('cv'))
const frameEl = document.querySelector('.frame')
const headEl = document.querySelector('.head')

// ---- four slots milled into the plate ------------------------------------
const slots = document.querySelector('.slots')
const puts = PARAMS.map(p => {
  const el = document.createElement('div')
  el.className = 'slot'
  el.innerHTML = `<span class="name">${p.label}</span>
    <div class="rail" role="slider" tabindex="0" aria-label="${p.label}"><i></i></div>
    <span class="num"></span>`
  const rail = el.querySelector('.rail')
  const knob = el.querySelector('i')
  const num = el.querySelector('.num')

  const put = v => {
    knob.style.left = `${((v - p.min) / (p.max - p.min)) * 100}%`
    num.textContent = p.k === 'temp'
      ? `${v > 0 ? '+' : ''}${v.toFixed(2)}`
      : `${v.toFixed(2)}${p.unit.trim()}`
    rail.setAttribute('aria-valuenow', v.toFixed(2))
  }
  const fromX = x => {
    const r = rail.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (x - r.left) / r.width))
    const v = Math.round((p.min + t * (p.max - p.min)) / p.step) * p.step
    core.set(p.k, v); put(v)
  }
  rail.addEventListener('pointerdown', e => { rail.setPointerCapture(e.pointerId); fromX(e.clientX) })
  rail.addEventListener('pointermove', e => { if (rail.hasPointerCapture(e.pointerId)) fromX(e.clientX) })
  rail.addEventListener('keydown', e => {
    const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (!d) return
    e.preventDefault()
    const v = Math.max(p.min, Math.min(p.max, core.G[p.k] + d * p.step * (e.shiftKey ? 10 : 1)))
    core.set(p.k, v); put(v)
  })
  slots.appendChild(el)
  put(p.val)
  return put
})

// ---- source chips ---------------------------------------------------------
const row = document.querySelector('.row')
core.plates.forEach((pl, i) => {
  const b = document.createElement('button')
  b.className = 'chip'
  b.style.backgroundImage = `url(${pl.c.toDataURL()})`
  b.setAttribute('aria-label', pl.name)
  b.addEventListener('click', () => core.usePlate(i))
  row.appendChild(b)
})

core.fileInput(document.getElementById('file'))
    .dropTarget(frameEl, over => frameEl.classList.toggle('over', over))

document.getElementById('pick').addEventListener('click', () => document.getElementById('file').click())
document.getElementById('reset').addEventListener('click', () => {
  core.reset()
  PARAMS.forEach((p, i) => puts[i](p.val))
})

// ---- transport ------------------------------------------------------------
const sw = document.getElementById('run')
sw.addEventListener('click', async () => {
  await core.toggle()
  sw.setAttribute('aria-pressed', core.playing ? 'true' : 'false')
  sw.textContent = core.playing ? 'Running' : 'Run'
  frameEl.classList.toggle('playing', core.playing)
  if (core.playing) sweep()
})
function sweep() {
  if (!core.playing) return
  headEl.style.transform = `translateX(${core.progress * frameEl.clientWidth}px)`
  requestAnimationFrame(sweep)
}

// ---- the reading, engraved ------------------------------------------------
const dl = document.querySelector('.card dl')
core.on((A, M) => {
  const rows = [
    ['Source', core.sourceName.replace(/\.[a-z0-9]+$/i, '')],
    ['Mode', `<em>${M.modeName}</em>`],
    ['Activity', M.activity.toFixed(2)],
    ['Register', `oct ${M.oct}`],
    ['Note', `${M.noteLen.toFixed(2)} s`],
    ['Space', M.wet.toFixed(2)],
    ['Motif', `${M.motif.length} notes`],
  ]
  dl.innerHTML = rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')
})

expose(core)
core.render()
