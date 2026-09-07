import './style.css'
import { PARAMS, gradePixels } from './grade.js'
import { analyse, AW, AH } from './analysis.js'
import { decide } from './music.js'
import { Engine } from './engine.js'
import { makePlates } from './plates.js'
import { paint } from './readout.js'

const W = 1024, H = 576

const cv = document.getElementById('cv')
const ctx = cv.getContext('2d', { willReadFrequently: true })
const frameEl = document.getElementById('frame')
const headEl = document.getElementById('head')
const srcName = document.getElementById('srcname')
const readoutEl = document.getElementById('readout')

const acv = document.createElement('canvas')
acv.width = AW; acv.height = AH
const actx = acv.getContext('2d', { willReadFrequently: true })

const engine = new Engine()
const G = {}
PARAMS.forEach(p => { G[p.k] = p.val })

const plates = makePlates(W, H)
let src = plates[0].c

// ---- controls -------------------------------------------------------------
const controls = document.getElementById('controls')
PARAMS.forEach(p => {
  const wrap = document.createElement('div')
  wrap.className = 'ctrl'
  wrap.innerHTML = `<span class="lab">${p.label}</span><output></output>`
  const r = document.createElement('input')
  r.type = 'range'; r.min = p.min; r.max = p.max; r.step = p.step; r.value = p.val
  r.setAttribute('aria-label', p.label)
  r.addEventListener('input', () => { G[p.k] = parseFloat(r.value); schedule() })
  wrap.appendChild(r)
  controls.appendChild(wrap)
  p.el = r; p.out = wrap.querySelector('output')
})

function paintOutputs() {
  PARAMS.forEach(p => {
    const v = G[p.k]
    p.out.textContent = p.k === 'temp'
      ? `${v > 0 ? '+' : ''}${v.toFixed(2)}${v > 0.02 ? ' warm' : v < -0.02 ? ' cool' : ' neutral'}`
      : `${v.toFixed(2)}${p.unit}`
  })
}

document.getElementById('reset').addEventListener('click', () => {
  PARAMS.forEach(p => { G[p.k] = p.val; p.el.value = p.val })
  render()
})

// ---- plates ---------------------------------------------------------------
const platesEl = document.getElementById('plates')
plates.forEach(p => {
  const b = document.createElement('button')
  b.style.backgroundImage = `url(${p.c.toDataURL()})`
  b.setAttribute('aria-label', p.name)
  b.addEventListener('click', () => { src = p.c; srcName.textContent = p.name; render() })
  platesEl.appendChild(b)
})

// ---- render ---------------------------------------------------------------
let queued = false
function schedule() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; render() })
}

export function render() {
  ctx.clearRect(0, 0, W, H)
  ctx.drawImage(src, 0, 0, W, H)
  const img = ctx.getImageData(0, 0, W, H)
  gradePixels(img.data, G)
  ctx.putImageData(img, 0, 0)
  ctx.fillStyle = 'rgba(255,255,255,.13)'
  for (let b = 1; b < 4; b++) ctx.fillRect(Math.round((W * b) / 4), 0, 1, H)

  const A = analyse(src, G, actx)
  const M = decide(A)
  paintOutputs()
  paint(readoutEl, A, M)
  engine.apply(A, M)
  window.__frameScore = { A, M }        // for measuring from the console
}

// ---- transport ------------------------------------------------------------
const btn = document.getElementById('play')
btn.addEventListener('click', async () => {
  if (!engine.playing) {
    await engine.start()
    btn.textContent = 'Stop'
    btn.setAttribute('aria-pressed', 'true')
    frameEl.classList.add('playing')
    sweep()
  } else {
    engine.stop()
    btn.textContent = 'Play'
    btn.setAttribute('aria-pressed', 'false')
    frameEl.classList.remove('playing')
  }
})

function sweep() {
  if (!engine.playing) return
  headEl.style.transform = `translateX(${engine.progress * frameEl.clientWidth}px)`
  requestAnimationFrame(sweep)
}

// ---- bring your own frame -------------------------------------------------
export function loadFile(file) {
  if (!file || !/^image\//.test(file.type)) return
  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const g = c.getContext('2d')
    const s = Math.max(W / img.width, H / img.height)
    const dw = img.width * s, dh = img.height * s
    g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
    src = c
    srcName.textContent = file.name
    URL.revokeObjectURL(url)
    render()
  }
  img.src = url
}

const fi = document.getElementById('file')
fi.addEventListener('change', () => loadFile(fi.files[0]))
document.querySelector('label[for=file]').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click() }
})
for (const ev of ['dragenter', 'dragover']) {
  frameEl.addEventListener(ev, e => { e.preventDefault(); frameEl.classList.add('over') })
}
for (const ev of ['dragleave', 'drop']) {
  frameEl.addEventListener(ev, e => { e.preventDefault(); frameEl.classList.remove('over') })
}
frameEl.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]))

// load a frame by URL — used by the measuring harness
window.__load = url => new Promise(res => {
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const g = c.getContext('2d')
    const s = Math.max(W / img.width, H / img.height)
    g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s)
    src = c; srcName.textContent = url.split('/').pop()
    render(); res(window.__frameScore)
  }
  img.src = url
})

render()
