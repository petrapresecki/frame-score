import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Frame } from './Frame.jsx'

// DIRECTION C — the loupe.
//
// The reel is not the frame and never pretends to be. Candidates hang in front
// of the bay small, ungraded and raw, the way a strip is held up against a light
// box before anything is committed to it. The graded frame stays behind them the
// whole time.
//
// Picking is the only thing that reaches the gate: the chosen shot grows out of
// the reel into the frame and takes the grade as it lands. That promotion is the
// piece's own claim made visible — a shot becomes a score by being graded — so
// it is one continuous move and never a swap.
//
// This matters beyond neatness: a reel that loaded on every settle would grade
// and sound the key art on its way past, and a poster is the most musical thing
// in the reel for reasons that have nothing to do with cinematography.

const STEP = 30          // degrees between shots on the cylinder
const SPAN = 3           // shots drawn either side; past this they are edge-on
const RADIUS = 1.25      // cylinder radius, in frame widths
const THROW = 0.62       // drag distance for one shot, in frame widths
const FRICTION = 0.94    // per-frame decay of a thrown reel
const SETTLE = 0.16      // ease toward the nearest shot once it is slow
const CLICK = 6          // px of travel still counted as a click, not a drag
const LOUPE = 0.58       // a candidate's size, in frame widths — clearly not the frame
const OPEN = 0.12        // per-frame ease of the reel opening and closing

export function Reel({
  core, canvasRef, playing, onToggle,
  shots, index, onIndex, onPick, open, onOpen,
  chords, band, children,
}) {
  const boxRef = useRef(null)
  const gateRef = useRef(null)
  const [w, setW] = useState(0)

  // pos is the reel's continuous position, in shots, and amt is how open the
  // reel is. Neither is React state: both change every frame of a spin, and
  // re-rendering the graded canvas at 60fps would fight the engine for the
  // main thread.
  const pos = useRef(0)
  const vel = useRef(0)
  const amt = useRef(0)
  const drag = useRef(null)
  const moved = useRef(0)
  const slots = useRef(new Map())

  useLayoutEffect(() => {
    const el = boxRef.current
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    setW(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  useEffect(() => { pos.current = index; vel.current = 0 }, [shots])

  useEffect(() => {
    if (!w) return
    let raf = 0

    // Rotate about a centre RADIUS behind the gate, then pull the whole reel
    // forward as it opens, so candidates arrive out of the frame rather than
    // fading up on top of it.
    function seat(el, i, a) {
      if (!el) return
      const d = i - pos.current
      const ad = Math.abs(d)
      const r = RADIUS * w
      const near = w * 0.16 * a
      el.style.transform =
        `translateZ(${near - r}px) rotateY(${d * STEP}deg) translateZ(${r}px) scale(${LOUPE})`
      el.style.opacity = String(a * (ad < 0.5 ? 1 : Math.max(0, 0.62 - (ad - 0.5) * 0.24)))
      el.style.zIndex = String(200 - Math.round(ad * 10))
      el.style.visibility = a < 0.01 || ad > SPAN + 0.5 ? 'hidden' : 'visible'
      el.style.pointerEvents = a > 0.9 && ad < SPAN ? 'auto' : 'none'
    }

    function paint() {
      const a = amt.current
      for (const [i, el] of slots.current) seat(el, i, a)
      // the bay dims behind the reel so the candidates read as being in front
      if (gateRef.current) gateRef.current.style.opacity = String(1 - 0.62 * a)
    }

    function step() {
      raf = requestAnimationFrame(step)

      const want = open && shots.length ? 1 : 0
      if (Math.abs(amt.current - want) > 0.001) amt.current += (want - amt.current) * OPEN
      else amt.current = want

      if (!drag.current && shots.length) {
        const target = Math.round(pos.current)
        if (Math.abs(vel.current) > 0.0015) {
          pos.current += vel.current
          vel.current *= FRICTION
        } else if (Math.abs(pos.current - target) > 0.0005) {
          // settle: ease the last fraction rather than snapping, so the reel
          // comes to rest instead of arriving
          pos.current += (target - pos.current) * SETTLE
          vel.current = 0
        } else {
          pos.current = target
        }
        pos.current = Math.max(0, Math.min(shots.length - 1, pos.current))

        const settled = Math.round(pos.current)
        // the centred shot is only ever *reported*, never loaded — onIndex
        // moves the marker, onPick is the one that reaches the gate
        if (settled !== index && Math.abs(pos.current - settled) < 0.02 && Math.abs(vel.current) < 0.004) {
          onIndex(settled)
        }
      }
      paint()
    }

    step()
    return () => cancelAnimationFrame(raf)
  }, [w, shots, index, onIndex, open])

  // Deliberately not setPointerCapture: capturing retargets the click to the
  // box, so the candidate's own handler never runs and a pick reads as a click
  // on the bay. The drag is followed on the window instead, which also keeps it
  // alive when the pointer leaves the frame.
  const down = e => {
    if (drag.current) return
    drag.current = { x: e.clientX, from: pos.current, t: performance.now(), last: e.clientX }
    moved.current = 0
    vel.current = 0
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
    window.addEventListener('pointercancel', up, { once: true })
  }

  const move = e => {
    const d = drag.current
    if (!d || !w) return
    moved.current = Math.max(moved.current, Math.abs(e.clientX - d.x))

    // a sideways drag on the closed frame is how the reel is asked for again
    if (!open && moved.current > CLICK && shots.length) onOpen(true)
    if (!shots.length) return

    pos.current = Math.max(-0.4, Math.min(shots.length - 0.6, d.from - (e.clientX - d.x) / (THROW * w)))

    // velocity from the last few ms only, so a slow drag ending in a flick is
    // thrown and one that ends at rest is not
    const now = performance.now()
    const dt = now - d.t
    if (dt > 8) {
      vel.current = (-(e.clientX - d.last) / (THROW * w)) * (16 / dt)
      d.t = now; d.last = e.clientX
    }
  }

  const up = () => {
    drag.current = null
    window.removeEventListener('pointermove', move)
  }

  // A click that reached the bay itself rather than a candidate: run the frame,
  // or put the reel away without setting anything. Candidates stop their own
  // clicks from getting here.
  const bay = () => {
    if (moved.current >= CLICK) return
    if (open) onOpen(false)
    else onToggle()
  }

  const wheel = e => {
    if (!open || !shots.length) return
    vel.current += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / 900
  }

  // a candidate: the centred one is the commit, the others spin themselves in
  const tap = i => {
    if (moved.current >= CLICK) return
    if (i === index) onPick(i)
    else onIndex(i)
  }

  const has = shots.length > 0

  return (
    <div
      className="w-full"
      // clipped sideways so the reel runs off the edge of its column rather
      // than over the tape, but open vertically: the playhead overhangs the
      // frame and the cue sits below it
      style={{ overflowX: 'clip', overflowY: 'visible', overflowClipMargin: '0px' }}
    >
      <div
        ref={boxRef}
        tabIndex={0}
        onPointerDown={down}
        onClick={bay}
        onWheel={wheel}
        onKeyDown={e => {
          if (e.key === ' ') { e.preventDefault(); onToggle() }
          if (e.key === 'Escape' && open) { e.preventDefault(); onOpen(false) }
          if (!has) return
          if (e.key === 'Enter' && open) { e.preventDefault(); onPick(index) }
          if (e.key === 'ArrowRight') { e.preventDefault(); onOpen(true); onIndex(Math.min(shots.length - 1, index + 1)) }
          if (e.key === 'ArrowLeft') { e.preventDefault(); onOpen(true); onIndex(Math.max(0, index - 1)) }
        }}
        aria-label={playing ? 'the frame, playing. space to pause' : 'the frame. space to play'}
        className={`relative aspect-video w-full select-none outline-none touch-none
                    shadow-[0_0_0_1.5px_#fff,0_8px_22px_-10px_rgba(0,0,0,.5)]
                    focus-visible:shadow-[0_0_0_1.5px_#fff,0_0_0_4px_var(--color-glow)]
                    ${open ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
        style={{ perspective: `${Math.max(1, w) * 2.4}px` }}
      >
        {/* the gate: the graded canvas, the marks, the playhead. Only ever
            holds a shot that was picked. */}
        <div ref={gateRef} className="absolute inset-0">
          <Frame core={core} canvasRef={canvasRef} playing={playing} chords={chords} band={band} />
        </div>

        {shots.map((s, i) => (
          <button
            key={s.id}
            type="button"
            ref={el => { el ? slots.current.set(i, el) : slots.current.delete(i) }}
            onClick={e => { e.stopPropagation(); tap(i) }}
            tabIndex={-1}
            aria-label={`shot ${i + 1} of ${shots.length}`}
            className="absolute inset-0 block cursor-pointer border-0 bg-transparent p-0
                       will-change-[transform,opacity]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <img
              src={s.reel}
              alt=""
              draggable={false}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {/* the centred candidate is the one a click would set */}
            <span
              className={`pointer-events-none absolute inset-0 transition-shadow duration-300
                          ${i === index ? 'shadow-[inset_0_0_0_1px_var(--accent)]' : 'shadow-none'}`}
            />
          </button>
        ))}
      </div>

      {/* Kept outside the frame so the horizontal clip cannot reach it. The
          transport is written by hand, the way the portfolio writes its name;
          the line after it says what the frame is now. */}
      <div className="relative mt-[10px] flex flex-wrap items-baseline gap-x-[18px] gap-y-[2px]">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={playing}
          className="cursor-pointer border-0 bg-transparent py-0 pl-[8px] pr-[2px] font-script text-[44px] leading-none text-ink
                     transition-colors duration-[250ms] hover:text-glow"
        >
          {playing ? 'pause' : 'play'}
        </button>
        {children}
        {has && (
          <button
            type="button"
            onClick={() => onOpen(!open)}
            className="ml-auto cursor-pointer border-[1.5px] border-ink bg-white/75 px-[8px] font-mono text-[13px]
                       tabular-nums text-ink transition-colors duration-[250ms] hover:text-glow"
          >
            {open ? 'close the reel' : 'the reel'} · {String(index + 1).padStart(2, '0')}/{String(shots.length).padStart(2, '0')}
          </button>
        )}
        {open && has && (
          <p className="m-0 basis-full font-mono text-[12.5px] italic text-ink-soft">
            drag to spin, click the one in the middle to grade it
          </p>
        )}
      </div>
    </div>
  )
}
