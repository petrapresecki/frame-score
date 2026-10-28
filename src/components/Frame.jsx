import { useEffect, useRef, useState } from 'react'

// The marks: which part of the picture is sounding, drawn from the same numbers
// the engine plays. The band being read is the chord, and every motif note is
// struck at the column peak it was measured from. Height in the frame is pitch,
// so a note is marked as a rule at its own height — the mark is the mapping,
// not an effect.
const BANDS = 4

export function Frame({ core, canvasRef, playing, band = null }) {
  const wrapRef = useRef(null)
  const marksRef = useRef(null)
  const headRef = useRef(null)
  const [over, setOver] = useState(false)

  useEffect(() => {
    if (!core) return
    const mctx = marksRef.current.getContext('2d')
    let marks = []
    let band = 0
    let raf = 0

    // A mark is struck because the engine said it struck a note — this used to
    // re-derive the step from the transport and keep its own copy of the motif
    // rules, which is two copies of one truth and drifts apart. The engine now
    // says what it played, and the peak column it was measured from is looked
    // up from the same pan the note was played at.
    const untap = core.tap(e => {
      if (e.k === 'band') { band = e.band; return }
      if (e.k !== 'note') return
      const A = core.A
      if (!A) return
      const x = (e.found + 1) / 2
      const col = Math.round(x * (A.peak.length - 1))
      marks.push({ x, y: A.peakY[col], band: e.band, vel: e.vel, born: performance.now() })
    })

    // The marks canvas is sized in CSS pixels, explicitly, and here is why.
    //
    // It used to be laid out with `absolute inset-0` and no width or height.
    // That stretches a div, but a canvas is a *replaced* element, and for those
    // `width: auto` resolves to the intrinsic width — the backing store — with
    // the over-constrained `right` simply ignored. So the element's CSS size
    // was `cv.width × cv.height`, which this function sets to w·dpr × h·dpr:
    // on a 2× display the overlay was laid out at twice the size of the shot,
    // and the band edges and pitch rules spilled past the picture onto the
    // field. (Band 0's two edges landing at 0 and w/2 rather than 0 and w/4 is
    // the signature.)
    //
    // It was latent rather than new: while the first pass ran at zero size the
    // backing store stayed 0, so the overlay was invisible instead of wrong.
    // Fixing the loop and the resize check is what made it show.
    //
    // Everything is measured from the picture canvas, not the wrapper, so the
    // marks are anchored to the shot itself whatever the box around it does.
    function place(pic, w, h) {
      const cv = marksRef.current
      const l = pic.offsetLeft, t = pic.offsetTop
      if (cv._l === l && cv._t === t && cv._w === w && cv._h === h) return
      cv._l = l; cv._t = t; cv._w = w; cv._h = h
      cv.style.left = `${l}px`
      cv.style.top = `${t}px`
      cv.style.width = `${w}px`
      cv.style.height = `${h}px`
      // the playhead overhangs the shot by 8px top and bottom, and nothing else
      const head = headRef.current
      head.style.left = `${l}px`
      head.style.top = `${t - 8}px`
      head.style.height = `${h + 16}px`
    }

    function drawMarks(now) {
      const pic = canvasRef.current
      if (!pic) return
      const w = pic.clientWidth, h = pic.clientHeight
      if (!w || !h) return        // laid out at zero: nothing to draw on yet
      place(pic, w, h)
      const cv = marksRef.current
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const pw = Math.round(w * dpr), ph = Math.round(h * dpr)
      // both are checked: the shot can change height without changing width
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph }
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      mctx.clearRect(0, 0, w, h)
      if (!core.playing) return

      // a mark persists a little beyond a very short note, the way a trace
      // persists on a scope — below about half a second nothing registers as
      // having happened
      const life = Math.min(2600, Math.max(480, (core.M?.noteLen ?? 1) * 1000))
      const bw = w / BANDS
      const bi = band

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

    // The loop never stops. Ending it on pause left the playhead parked
    // wherever the last frame caught it and froze the marks mid-decay, while
    // the engine's own release fade was still sounding for the best part of a
    // second — the transport is a fade, so the picture has to fade with it.
    function sweep(now = performance.now()) {
      raf = requestAnimationFrame(sweep)
      if (!core.playing) { drawMarks(now); marks = []; return }
      drawMarks(now)
      const pic = canvasRef.current
      if (pic) headRef.current.style.transform = `translateX(${core.progress * pic.clientWidth}px)`
    }

    // the marks are driven by requestAnimationFrame, which a headless or hidden
    // window throttles to nothing — so they can be stepped by hand to be measured
    window.__marks = () => marks.map(m => ({ ...m, age: performance.now() - m.born }))

    sweep()
    return () => { cancelAnimationFrame(raf); untap() }
  }, [core, playing])

  const drop = e => {
    e.preventDefault()
    setOver(false)
    core?.loadFile(e.dataTransfer.files[0])
  }

  return (
    // The gate's contents. Sizing, the spin gesture, click-to-run and the cue
    // belong to the Reel — this is only ever the picture at the gate.
    <div
      ref={wrapRef}
      onDragEnter={e => { e.preventDefault(); setOver(true) }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={e => { e.preventDefault(); setOver(false) }}
      onDrop={drop}
      className="absolute inset-0 select-none"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* the marks are drawn over the frame, never into it — the graded pixels
          stay exactly what the analysis reads */}
      <canvas ref={marksRef} className="pointer-events-none absolute" />

      <div
        ref={headRef}
        className={`pointer-events-none absolute w-0.5 bg-[var(--accent)]
                    transition-opacity duration-[1400ms] ease-out
                    ${playing ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* the band being heard, underlined in the tone at the foot of the shot */}
      <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className={`transition-shadow duration-500 ${band === i ? 'shadow-[inset_0_-2px_0_var(--tone)]' : ''}`} />
        ))}
      </div>

      {over && (
        <div className="absolute inset-0 grid place-items-center bg-field/85 outline-1 -outline-offset-8 outline-dashed outline-ink">
          <span className="text-[14px]">drop it here</span>
        </div>
      )}
    </div>
  )
}
