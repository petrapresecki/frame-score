import { useState } from 'react'
import { HUENAME } from '../music.js'
import { chordName, keyName, tempoWord } from '../names.js'

// The reading as a cluster of silhouettes, after eylonmalkevich.com: flat
// white objects packed into one composition, each one standing for a part of
// what was heard. Point at one (or focus it, or its name in the list below)
// and it fills with the shot — the frame seen through a window cut in the
// shape of what it decided. Every value the old tape printed is here, so this
// is still the tuning instrument.

const f2 = x => x.toFixed(2)

// the chord the progression returns to most, and where
function home(M) {
  const names = M.prog.map(c => chordName(c.deg))
  const count = {}
  names.forEach(n => { count[n] = (count[n] ?? 0) + 1 })
  const top = names.reduce((a, b) => (count[b] > count[a] ? b : a), names[0])
  return { names, top, n: count[top] }
}

// Drawn on a 600 × 400 board, packed so they touch the way his do.
const SHAPES = {
  // a key, for the key
  key: 'M88 40a70 70 0 1 0 0 140a70 70 0 0 0 66-46h120v34h26v-34h20v20h26v-20h18v-34H154A70 70 0 0 0 88 40zm0 48a22 22 0 1 1 0 44a22 22 0 0 1 0-44z',
  // a bulb, for the light
  light: 'M430 28a78 78 0 0 0-46 141c10 8 14 18 14 30v16h64v-16c0-12 4-22 14-30a78 78 0 0 0-46-141zM402 222h56v14h-56zM408 242h44l-8 16h-28z',
  // a metronome, for the pace
  pace: 'M78 200h76l42 196H36zM118 368l58-170 14 5-58 170z',
  // two beamed notes, for the tune
  tune: 'M262 196l118-30v176a34 26-20 1 1-14-22V214l-90 23v126a34 26-20 1 1-14-22z',
  // a speaker, for the room
  room: 'M414 284h54v76h-54zM468 284l90-46v168l-90-46z',
  // a drop, for the colour
  colour: 'M548 24c-14 46-52 78-52 120a52 52 0 0 0 104 0c0-42-38-74-52-120z',
}

export function Reading({ reading, title, band, still }) {
  const { A, M } = reading ?? {}
  const [on, setOn] = useState('key')
  if (!A || !M) return null
  const h = home(M)

  const groups = [
    { id: 'key', name: 'key', head: keyName(M), rows: [
      [`${h.top} is played in`, `${h.n} of 4 bars`],
      ...h.names.map((n, i) => [`bar ${i + 1}${band === i ? ' ♡ now' : ''}`, n]),
    ] },
    { id: 'pace', name: 'pace', head: tempoWord(M.activity), rows: [
      ['activity', f2(M.activity)], ['note', `${f2(M.noteLen)} s`], ['attack', `${M.attack.toFixed(1)} s`], ['restates', `${M.repeats}×`],
    ] },
    { id: 'light', name: 'light', head: `key ${f2(A.keyN)}`, rows: [
      ['key light', f2(A.keyN)], ['detail', f2(A.detail)], ['focus', f2(A.focus)],
    ] },
    { id: 'tune', name: 'tune', head: `${M.motif.length} notes`, rows: [
      ['motif', `${M.motif.length} notes`], ['voices', `${M.voices}`], ['register', `oct ${M.oct}${M.lift ? (M.lift > 0 ? ' +8' : ' −8') : ''}`],
    ] },
    { id: 'room', name: 'room', head: `wet ${f2(M.wet)}`, rows: [
      ['space', f2(A.spaceN)], ['wet', f2(M.wet)], ['width', f2(M.width)],
    ] },
    { id: 'colour', name: 'colour', head: HUENAME[A.hue], rows: [
      ['palette', HUENAME[A.hue] + (A.palette ? ' ↔' : '')], ['colour', f2(A.colour)], ['symmetry', f2(A.sym)],
    ] },
  ]
  const cur = groups.find(g => g.id === on)

  return (
    <section aria-labelledby="reading-title" className="min-w-0">
      <p className="m-0 text-[15px]">I taught my computer to listen to</p>
      <h2 id="reading-title" className="m-0 font-serif text-[34px] font-normal leading-[1.05] max-[900px]:text-[30px]">
        {title}
      </h2>

      <svg viewBox="0 0 600 400" className="mt-[14px] mb-[6px] block w-full max-w-[480px] overflow-visible max-[900px]:max-w-full" aria-hidden>
        <defs>
          <pattern id="shot" patternUnits="userSpaceOnUse" width="600" height="400">
            {still && <image href={still} width="600" height="400" preserveAspectRatio="xMidYMid slice" />}
          </pattern>
        </defs>
        {groups.map(g => (
          <path
            key={g.id}
            d={SHAPES[g.id]}
            fillRule="evenodd"
            onPointerEnter={() => setOn(g.id)}
            className={`silhouette cursor-pointer ${on === g.id ? 'is-on' : ''} ${g.id === 'tune' && band !== null ? 'is-sounding' : ''}`}
          />
        ))}
      </svg>

      {/* his "PROJECTS: [01] 9*s [02] Sacred Geometrics …", as what was heard */}
      <p className="m-0 mt-[10px] font-serif text-[22px] leading-[1.25] max-[900px]:text-[19px]">
        <span className="font-pixel text-[15px] font-bold tracking-[.04em]">HEARD: </span>
        {groups.map(g => (
          <button
            key={g.id}
            type="button"
            aria-pressed={on === g.id}
            onClick={() => setOn(g.id)}
            onFocus={() => setOn(g.id)}
            onPointerEnter={() => setOn(g.id)}
            className={`mr-[12px] inline cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 font-serif text-inherit
                        ${on === g.id ? 'text-ink' : 'text-ink/45 hover:text-ink'}`}
          >
            <span className={`font-mono text-[14px] ${on === g.id ? 'text-glow' : ''}`}>[{g.name}]</span> {g.head}
          </button>
        ))}
      </p>

      <dl className="m-0 mt-[8px] flex flex-wrap gap-x-[18px] gap-y-[2px] text-[13.5px]">
        {cur.rows.map(([k, v]) => (
          <div key={k} className={`flex gap-[6px] ${k.includes('now') ? 'text-glow' : ''}`}>
            <dt className="text-ink-soft">{k}</dt>
            <dd className="m-0 font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
