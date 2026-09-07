import './skin.css'
import { Core, PARAMS, expose } from '../../core.js'

const stage = document.querySelector('.stage')
const frameEl = document.querySelector('.frame')
const headEl = document.querySelector('.head')
const stateEl = document.querySelector('.state')
const hintEl = document.querySelector('.hint')
const core = new Core(document.getElementById('cv'))

// ---- controls, drawn as hairlines on the frame itself --------------------
const controls = document.querySelector('.controls')
const tracks = PARAMS.map(p => {
  const el = document.createElement('div')
  el.className = 'track'
  el.tabIndex = 0
  el.setAttribute('role', 'slider')
  el.setAttribute('aria-label', p.label)
  el.innerHTML = `<b>${p.label}</b><s></s><i></i>`
  const dot = el.querySelector('i')
  const val = el.querySelector('s')

  const put = v => {
    const t = (v - p.min) / (p.max - p.min)
    dot.style.left = `${t * 100}%`
    val.textContent = p.k === 'temp'
      ? `${v > 0 ? '+' : ''}${v.toFixed(2)}`
      : `${v.toFixed(2)}${p.unit.trim()}`
    el.setAttribute('aria-valuenow', v.toFixed(2))
  }

  const setFromX = clientX => {
    const r = el.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    const v = Math.round((p.min + t * (p.max - p.min)) / p.step) * p.step
    core.set(p.k, v); put(v)
  }

  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId)
    frameEl.classList.add('tuning')
    setFromX(e.clientX)
    dismissHint()
  })
  el.addEventListener('pointermove', e => { if (el.hasPointerCapture(e.pointerId)) setFromX(e.clientX) })
  el.addEventListener('pointerup', () => frameEl.classList.remove('tuning'))
  el.addEventListener('keydown', e => {
    const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (!d) return
    e.preventDefault()
    const v = Math.max(p.min, Math.min(p.max, core.G[p.k] + d * p.step * (e.shiftKey ? 10 : 1)))
    core.set(p.k, v); put(v)
  })

  controls.appendChild(el)
  put(p.val)
  return { p, put }
})

// ---- source, as marks on the same surface --------------------------------
const sources = document.querySelector('.sources')
core.plates.forEach((pl, i) => {
  const b = document.createElement('button')
  b.style.backgroundImage = `url(${pl.c.toDataURL()})`
  b.setAttribute('aria-label', pl.name)
  b.addEventListener('click', e => { e.stopPropagation(); core.usePlate(i); dismissHint() })
  sources.appendChild(b)
})

const file = document.getElementById('file')
core.fileInput(file).dropTarget(frameEl, over => frameEl.classList.toggle('over', over))

// ---- the frame is the transport ------------------------------------------
let dismissed = false
function dismissHint() {
  if (dismissed) return
  dismissed = true
  hintEl.classList.add('gone')
}

frameEl.addEventListener('click', async () => {
  dismissHint()
  const on = await core.toggle()
  frameEl.classList.toggle('playing', core.playing)
  if (core.playing) sweep()
})
frameEl.addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); frameEl.click() }
})
frameEl.tabIndex = 0

function sweep() {
  if (!core.playing) return
  headEl.style.transform = `translateX(${core.progress * frameEl.clientWidth}px)`
  requestAnimationFrame(sweep)
}

// ---- the interface takes its colour from the image -----------------------
core.on((A, M) => {
  document.documentElement.style.setProperty('--accent', core.accent(0.55, 0.62))
  stateEl.innerHTML = core.playing
    ? `<em>${M.modeName}</em> · ${M.prog.length} chords · ${M.motif.length} notes`
    : `${core.sourceName}`
})

expose(core)
core.render()
