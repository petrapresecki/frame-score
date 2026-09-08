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
      className="group block touch-none cursor-ew-resize border-0 bg-none p-0 text-left
                 font-[inherit] text-inherit outline-none"
    >
      <span
        className={`block text-[clamp(38px,6.4vw,82px)] font-medium leading-[0.82]
                    tracking-[-0.03em] tabular-nums
                    ${pts === DATUM ? 'text-ink' : 'text-[var(--accent)]'}`}
      >
        {String(pts).padStart(2, '0')}
      </span>
      <span
        className="mt-[11px] flex items-baseline justify-between gap-2 border-t border-rule
                   pt-[7px] text-[11.5px] leading-none
                   group-focus-visible:border-[var(--accent)]"
      >
        <span className="text-ink group-focus-visible:text-[var(--accent)]">
          {p.label.toLowerCase()}
        </span>
        <span className="tabular-nums text-ink-half">{reading}</span>
      </span>
    </button>
  )
}

// Four integers on a datum of 25. The numeral is the control: drag it.
export function PrinterPoints({ core, grade, onGesture }) {
  return (
    <div
      className="col-start-2 row-start-2 grid max-w-[min(100%,calc((100vh_-_210px)*16/9))]
                 grid-cols-4 items-end gap-[clamp(12px,3vw,54px)] pt-[34px]
                 max-[900px]:col-start-1"
    >
      {core && PARAMS.map(p => (
        <Point key={p.k} p={p} value={grade[p.k]} core={core} onGesture={onGesture} />
      ))}
    </div>
  )
}
