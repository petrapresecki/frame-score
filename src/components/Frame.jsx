import { useEffect, useRef, useState } from 'react'

// The marks: which part of the picture is sounding, drawn from the same numbers
// the engine plays. The band being read is the chord, and every motif note is
// struck at the column peak it was measured from. Height in the frame is pitch,
// so a note is marked as a rule at its own height — the mark is the mapping,
// not an effect.
const BANDS = 4
const STEPS = 16 * BANDS

export function Frame({ core, canvasRef, playing, onToggle, cueGone }) {
  const wrapRef = useRef(null)
  const marksRef = useRef(null)
  const headRef = useRef(null)
  const [over, setOver] = useState(false)

  useEffect(() => {
    if (!core) return
    const wrap = wrapRef.current
    const mctx = marksRef.current.getContext('2d')
    let marks = []
    let lastStep = -1
    let raf = 0

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
        if (bi === 1 && m.slot === last) continue   // the engine drops band two's tail
        const x = ((m.pan ?? 0) + 1) / 2
        const col = Math.round(x * (cols - 1))
        marks.push({ x, y: A.peakY[col], band: bi, vel: m.vel, born: performance.now() })
      }
    }

    function drawMarks(now) {
      const w = wrap.clientWidth, h = wrap.clientHeight
      if (!w || !h) return        // laid out at zero: nothing to draw on yet
      const cv = marksRef.current
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (cv.width !== Math.round(w * dpr)) {
        cv.width = Math.round(w * dpr)
        cv.height = Math.round(h * dpr)
      }
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      mctx.clearRect(0, 0, w, h)
      if (!core.playing) return

      // a mark persists a little beyond a very short note, the way a trace
      // persists on a scope — below about half a second nothing registers as
      // having happened
      const life = Math.min(2600, Math.max(480, (core.M?.noteLen ?? 1) * 1000))
      const bw = w / BANDS
      const bi = Math.min(BANDS - 1, Math.floor(core.progress * BANDS))

      // These are drawn on the picture, not on the field, so they cannot use
      // the sampled accent: on a warm frame a warm accent is invisible.
      // Registration marks are neutral, and every one is laid over its own
      // shadow so it reads on a white sky and a black interior alike.
      const ink = a => { mctx.globalAlpha = a; mctx.fillStyle = '#fff' }
      const shade = a => { mctx.globalAlpha = a; mctx.fillStyle = '#000' }

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
        // hold through the attack, then fall away — a squared decay over a
        // 4.5 s note is dim within a few frames of being struck
        const fade = t < 0.16 ? 1 : 1 - (t - 0.16) / 0.84
        const y = Math.round(m.y * h) + 0.5
        const x = m.x * w

        // the rule sits at the height the pitch was taken from, and grows out
        // of the point rather than being drawn all at once
        const reach = bw * 0.5 * Math.min(1, t * 5)
        const tick = 3 + m.vel * 9 * (1 - t)

        shade(fade * 0.35)
        mctx.fillRect(x - reach, y - 1, reach * 2, 3)
        mctx.fillRect(x - 2, y - tick - 1, 4, tick * 2 + 2)

        ink(fade * 0.8)
        mctx.fillRect(x - reach, y, reach * 2, 1)

        // the peak itself, and a tick that opens with the attack so a struck
        // note reads as struck
        ink(fade)
        mctx.fillRect(x - 2, y - 2, 4, 4)
        mctx.fillRect(x - 0.5, y - tick, 1, tick * 2)
      }
      mctx.globalAlpha = 1
    }

    function sweep(now = performance.now()) {
      if (!core.playing) { drawMarks(now); marks = []; lastStep = -1; return }
      headRef.current.style.transform = `translateX(${core.progress * wrap.clientWidth}px)`
      const step = Math.min(STEPS - 1, Math.floor(core.progress * STEPS))
      if (step !== lastStep) { lastStep = step; fire(step) }
      drawMarks(now)
      raf = requestAnimationFrame(sweep)
    }

    // the marks are driven by requestAnimationFrame, which a headless or hidden
    // window throttles to nothing — so they can be stepped by hand to be measured
    window.__marks = () => marks.map(m => ({ ...m, age: performance.now() - m.born }))
    window.__tick = step => { fire(step); drawMarks(performance.now()); return marks.length }

    sweep()
    return () => cancelAnimationFrame(raf)
  }, [core, playing])

  const drop = e => {
    e.preventDefault()
    setOver(false)
    core?.loadFile(e.dataTransfer.files[0])
  }

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle() }
      }}
      onDragEnter={e => { e.preventDefault(); setOver(true) }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={e => { e.preventDefault(); setOver(false) }}
      onDrop={drop}
      className="relative col-start-2 row-start-1 aspect-video w-full max-w-[min(100%,calc((100vh_-_210px)*16/9))]
                 cursor-pointer select-none justify-self-start self-center outline-none
                 focus-visible:shadow-[0_0_0_2px_var(--accent)]
                 max-[900px]:col-start-1 max-[900px]:row-start-2"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* the marks are drawn over the frame, never into it — the graded pixels
          stay exactly what the analysis reads */}
      <canvas ref={marksRef} className="pointer-events-none absolute inset-0" />

      <div
        ref={headRef}
        className={`pointer-events-none absolute -top-2 -bottom-2 w-0.5 bg-[var(--accent)]
                    transition-opacity duration-[1400ms] ease-out
                    ${playing ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* the cue is set at the size of a caption and leaves the moment it is obeyed */}
      <p
        className={`absolute left-0 -bottom-[26px] m-0 text-[11.5px] text-ink-half
                    transition-opacity delay-200 duration-[1100ms] ease-out
                    ${cueGone ? 'opacity-0' : 'opacity-100'}`}
      >
        click to run
      </p>

      {over && (
        <div className="absolute inset-0 bg-field-deep outline-2 -outline-offset-8 outline-[var(--accent)]" />
      )}
    </div>
  )
}
