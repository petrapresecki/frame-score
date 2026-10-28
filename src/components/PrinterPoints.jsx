import { useRef } from 'react'
import { PARAMS } from '../grade.js'

// A timing bay sets an integer per channel against a datum. 0–50, 25 nominal.
//
// The four grade ranges are not symmetric about their defaults — contrast runs
// 0.4 to 2.4 from a default of 1 — so a straight linear map would print 15 at
// the datum on that control and 25 on the others. Each side is scaled to its
// own half instead, which is what a timing tape does: the datum is the
// one-light reference, and the points count away from it in both directions.
const POINTS = 50
const DATUM = POINTS / 2

const toPoints = (p, v) => v >= p.val
  ? DATUM + ((v - p.val) / (p.max - p.val)) * DATUM
  : DATUM - ((p.val - v) / (p.val - p.min)) * DATUM

const fromPoints = (p, n) => n >= DATUM
  ? p.val + ((n - DATUM) / DATUM) * (p.max - p.val)
  : p.val - ((DATUM - n) / DATUM) * (p.val - p.min)

const printed = (p, v) => p.k === 'temp'
  ? `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(2)}`
  : `${v.toFixed(2)}${p.unit.trim()}`

function Point({ p, value, core, onGesture }) {
  const drag = useRef(null)

  const pts = Math.round(toPoints(p, value))
  const reading = printed(p, value)

  // quantise in point space, so the numeral never skips or sticks
  const commit = n => {
    const q = Math.max(0, Math.min(POINTS, Math.round(n)))
    core.set(p.k, Math.max(p.min, Math.min(p.max, fromPoints(p, q))))
  }

  const down = e => {
    // capture keeps the drag alive once the pointer leaves the numeral;
    // a synthetic pointer has nothing to capture, so this is allowed to fail
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    drag.current = { from: e.clientX, base: toPoints(p, core.G[p.k]) }
    onGesture()
    e.preventDefault()
  }

  const move = e => {
    if (!drag.current) return
    // one point per 9 px of travel, so a full sweep is a deliberate gesture
    commit(drag.current.base + (e.clientX - drag.current.from) / 9)
  }

  const keydown = e => {
    const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1
            : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0
    if (d) {
      e.preventDefault()
      commit(toPoints(p, core.G[p.k]) + d * (e.shiftKey ? 5 : 1))
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      commit(DATUM)
    }
  }

  return (
    <button
      type="button"
      role="slider"
      aria-label={`${p.label}, printer points`}
      aria-valuemin={0}
      aria-valuemax={POINTS}
      aria-valuenow={pts}
      aria-valuetext={`${pts} points, ${reading}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={() => { drag.current = null }}
      onPointerCancel={() => { drag.current = null }}
      onKeyDown={keydown}
      // it is a <button>, so a bare click would otherwise do nothing at all
      onClick={e => e.preventDefault()}
      className={`group block touch-none cursor-ew-resize border-[1.5px] border-ink px-[9px] pb-[7px] pt-[5px]
                  text-left font-[inherit] text-inherit outline-none transition-shadow duration-300
                  focus-visible:shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--color-glow)]
                  ${pts === DATUM ? 'bg-white/80' : 'bg-white shadow-[0_0_0_3px_#fff,0_0_14px_var(--color-glow-soft)]'}`}
    >
      {/* a counter in a box, as thinkinboutyou counts its crushes; it glows
          once it has been moved off the datum */}
      <span
        className={`block font-serif text-[40px] leading-none tabular-nums max-[900px]:text-[34px]
                    ${pts === DATUM ? 'text-ink' : 'text-glow [text-shadow:0_0_6px_var(--color-glow-soft)]'}`}
      >
        {String(pts).padStart(2, '0')}
      </span>
      <span className="mt-[2px] flex flex-col text-[12.5px] leading-tight">
        <span>{p.label.toLowerCase()}</span>
        <span className="tabular-nums text-ink-soft">{reading}</span>
      </span>
    </button>
  )
}

// Four integers on a datum of 25. The numeral is the control: drag it, or
// focus it and use the arrow keys (shift for five, backspace for the datum).
export function PrinterPoints({ core, grade, onGesture }) {
  return (
    <div className="mt-[12px] grid grid-cols-4 gap-[10px] max-[900px]:grid-cols-2">
      {core && PARAMS.map(p => (
        <Point key={p.k} p={p} value={grade[p.k]} core={core} onGesture={onGesture} />
      ))}
    </div>
  )
}
