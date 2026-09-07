// Everything a skin needs, and nothing about how it looks.
//
// The three design directions share this file completely. If a direction ever
// needs the engine changed to work, that is worth knowing — so the split is
// kept honest here.

import { PARAMS, gradePixels } from './grade.js'
import { analyse, AW, AH } from './analysis.js'
import { decide } from './music.js'
import { Engine } from './engine.js'
import { makePlates } from './plates.js'

export const W = 1024, H = 576
export { PARAMS }

export class Core {
  constructor(canvas) {
    this.cv = canvas
    this.cv.width = W; this.cv.height = H
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })

    this.acv = document.createElement('canvas')
    this.acv.width = AW; this.acv.height = AH
    this.actx = this.acv.getContext('2d', { willReadFrequently: true })

    this.G = {}
    PARAMS.forEach(p => { this.G[p.k] = p.val })

    this.plates = makePlates(W, H)
    this.src = this.plates[0].c
    this.sourceName = this.plates[0].name

    this.engine = new Engine()
    this.listeners = []
    this.queued = false
    this.bands = true          // draw the four band divisions
  }

  on(fn) { this.listeners.push(fn); return this }

  set(k, v) { this.G[k] = v; this.schedule() }

  reset() {
    PARAMS.forEach(p => { this.G[p.k] = p.val })
    this.render()
  }

  usePlate(i) {
    this.src = this.plates[i].c
    this.sourceName = this.plates[i].name
    this.render()
  }

  schedule() {
    if (this.queued) return
    this.queued = true
    requestAnimationFrame(() => { this.queued = false; this.render() })
  }

  render() {
    const { ctx } = this
    ctx.clearRect(0, 0, W, H)
    ctx.drawImage(this.src, 0, 0, W, H)
    const img = ctx.getImageData(0, 0, W, H)
    gradePixels(img.data, this.G)
    ctx.putImageData(img, 0, 0)
    if (this.bands) {
      ctx.fillStyle = 'rgba(255,255,255,.13)'
      for (let b = 1; b < 4; b++) ctx.fillRect(Math.round((W * b) / 4), 0, 1, H)
    }

    const A = analyse(this.src, this.G, this.actx)
    const M = decide(A)
    this.A = A; this.M = M
    this.engine.apply(A, M)
    this.listeners.forEach(fn => fn(A, M, this))
    window.__frameScore = { A, M }
    return { A, M }
  }

  fit(img) {
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const g = c.getContext('2d')
    const s = Math.max(W / img.width, H / img.height)
    g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s)
    return c
  }

  loadFile(file) {
    if (!file || !/^image\//.test(file.type)) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      this.src = this.fit(img)
      this.sourceName = file.name
      URL.revokeObjectURL(url)
      this.render()
    }
    img.src = url
  }

  loadURL(url) {
    return new Promise(res => {
      const img = new Image()
      img.onload = () => {
        this.src = this.fit(img)
        this.sourceName = url.split('/').pop()
        res(this.render())
      }
      img.src = url
    })
  }

  // the frame's own dominant colour, for skins that take their accent from the
  // image rather than from a fixed palette
  accent(sat = 0.7, light = 0.55) {
    const h = (this.A ? this.A.hue : 1) * 30 + 15
    return `hsl(${h} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%)`
  }

  async play() {
    if (this.engine.playing) return
    await this.engine.start()
    this.listeners.forEach(fn => fn(this.A, this.M, this))
  }

  stop() {
    this.engine.stop()
    this.listeners.forEach(fn => fn(this.A, this.M, this))
  }

  toggle() { return this.engine.playing ? (this.stop(), false) : (this.play(), true) }

  get playing() { return this.engine.playing }
  get progress() { return this.engine.progress }

  // drag-and-drop, shared by every skin
  dropTarget(el, onOver) {
    for (const ev of ['dragenter', 'dragover']) {
      el.addEventListener(ev, e => { e.preventDefault(); onOver?.(true) })
    }
    for (const ev of ['dragleave', 'drop']) {
      el.addEventListener(ev, e => { e.preventDefault(); onOver?.(false) })
    }
    el.addEventListener('drop', e => this.loadFile(e.dataTransfer.files[0]))
    return this
  }

  fileInput(input) {
    input.addEventListener('change', () => this.loadFile(input.files[0]))
    return this
  }
}

// for the measuring harness, in every skin
export function expose(core) {
  window.__load = url => core.loadURL(url)
  window.__core = core
}
