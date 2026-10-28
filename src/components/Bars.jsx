import { HUENAME } from '../music.js'
import { chordName } from '../names.js'

// The four bands as four bars, in a quiet table. The bar that is sounding
// comes forward and a line fills across its row over its four seconds — the
// row is keyed on the band change, so every new bar starts the line again.
const SECONDS = 4

export function Bars({ reading, band, beat }) {
  const { A, M } = reading ?? {}
  if (!A || !M) return null
  const th = 'pb-[8px] text-left font-light text-mid'
  const h = 'max-[900px]:hidden'
  const t = s => `0:${String(s).padStart(2, '0')}`

  return (
    <table className="mt-[34px] w-full border-collapse">
      <caption className="sr-only">the four bars, one for each band of the frame, left to right</caption>
      <thead>
        <tr className="border-b border-rule">
          <th className={th}>bar</th><th className={th}>chord</th><th className={`${th} ${h}`}>colour</th>
          <th className={`${th} ${h}`}>band</th><th className={th}>light</th><th className={`${th} ${h}`}>notes</th>
          <th className={`${th} text-right`}>time</th>
        </tr>
      </thead>
      <tbody>
        {M.prog.map((c, i) => (
          <tr
            key={band === i ? `on-${beat}` : i}
            aria-current={band === i ? 'true' : undefined}
            className={`h-[40px] border-b border-rule transition-colors duration-500 ${band === i ? 'bar-on text-ink' : 'text-mid'}`}
          >
            <td>{i + 1}</td>
            <td>{chordName(c.deg)}</td>
            <td className={h}>{HUENAME[A.bands[i].hue]}</td>
            <td className={h}>{i * 25}–{i * 25 + 25}%</td>
            <td className="tabular-nums">{A.bands[i].lum.toFixed(2)}</td>
            <td className={`tabular-nums ${h}`}>{M.motif.length * M.repeats}</td>
            <td className="text-right tabular-nums">{t(i * SECONDS)}–{t(i * SECONDS + SECONDS)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
