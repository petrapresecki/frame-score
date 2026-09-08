import { useEffect, useRef, useState } from 'react'

const HUE = ['red', 'orange', 'amber', 'yellow', 'lime', 'green',
             'teal', 'cyan', 'blue', 'indigo', 'violet', 'magenta']

// the mode is the one line allowed to be loud
const ROWS = [
  ['mode',      (A, M) => M.modeName, true],
  ['palette',   (A) => HUE[A.hue] + (A.palette ? ' ↔' : '')],
  ['chords',    (A, M) => M.prog.map(c => HUE[c.hue].slice(0, 3)).join(' ')],
  ['activity',  (A, M) => M.activity.toFixed(2)],
  ['restates',  (A, M) => `${M.repeats}×`],
  ['note',      (A, M) => `${M.noteLen.toFixed(2)} s`],
  ['attack',    (A, M) => `${M.attack.toFixed(1)} s`],
  ['motif',     (A, M) => `${M.motif.length} notes`],
  ['voices',    (A, M) => `${M.voices}`],
  ['register',  (A, M) => `oct ${M.oct}${M.lift ? (M.lift > 0 ? ' +8' : ' −8') : ''}`],
  ['wet',       (A, M) => M.wet.toFixed(2)],
  ['width',     (A, M) => M.width.toFixed(2)],
  ['key light', (A) => A.keyN.toFixed(2)],
  ['detail',    (A) => A.detail.toFixed(2)],
  ['focus',     (A) => A.focus.toFixed(2)],
  ['space',     (A) => A.spaceN.toFixed(2)],
  ['colour',    (A) => A.colour.toFixed(2)],
  ['symmetry',  (A) => A.sym.toFixed(2)],
]

// a value that just moved is briefly the accent — the only motion in the tape
function Value({ value, loud }) {
  const [hot, setHot] = useState(false)
  const prev = useRef(value)

  useEffect(() => {
    if (prev.current === value) return
    prev.current = value
    if (loud) return
    setHot(true)
    const t = setTimeout(() => setHot(false), 90)
    return () => clearTimeout(t)
  }, [value, loud])

  const tone = loud ? 'font-bold text-[var(--accent)]'
    : hot ? 'text-[var(--accent)]'
    : 'text-ink transition-colors duration-[900ms] ease-out'

  return <dd className={`m-0 text-right ${tone}`}>{value}</dd>
}

export function Tape({ reading }) {
  const { A, M, sourceName } = reading ?? {}

  return (
    <aside className="m-0 flex min-h-0 flex-1 flex-col">
      <p className="m-0 mb-[22px] flex items-baseline justify-between text-[13px] font-bold leading-none">
        Frame Score<i className="not-italic font-normal text-ink-half">no. 01</i>
      </p>

      {/* Ribes has no tabular figures, so the value column is given a fixed
          width — otherwise the dt/dd boundary shifts on every update. */}
      <dl
        className="m-0 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_84px] content-start
                   overflow-hidden text-[11.5px] leading-[1.9] tabular-nums max-[900px]:hidden"
      >
        {A && M && ROWS.map(([label, read, loud]) => (
          <Line key={label} label={label} value={String(read(A, M))} loud={loud} />
        ))}
      </dl>

      <p
        className="mt-[18px] overflow-hidden text-ellipsis whitespace-nowrap border-t
                   border-rule-faint pt-[10px] text-[11.5px] text-ink-half"
      >
        {sourceName ?? ''}
      </p>
    </aside>
  )
}

// dt and dd are siblings in one grid, so a row cannot be wrapped in an element
function Line({ label, value, loud }) {
  return (
    <>
      <dt className="text-ink-quarter">{label}</dt>
      <Value value={value} loud={loud} />
    </>
  )
}
