import { PICKS } from '../picks.js'

// My picks, as one quiet line of titles under the grade. The one at the gate
// carries a dot in the tone.
export function Picks({ film, onFilm, children }) {
  return (
    <nav aria-label="my picks" className="mt-[22px] leading-[1.9]">
      <span className="mr-[10px] text-mid">picks</span>
      {PICKS.map(f => {
        const current = film?.id === f.id
        return (
          <button
            key={f.id}
            type="button"
            aria-current={current}
            onClick={() => onFilm(f)}
            className={`mr-[14px] cursor-pointer border-0 bg-transparent p-0 font-mono text-[12.5px] font-light
                        transition-colors duration-200 hover:text-ink ${current ? 'text-ink' : 'text-mid'}`}
          >
            {current && <span aria-hidden className="mr-[5px] align-[2px] text-[9px] text-[var(--tone)]">●</span>}
            {f.title.toLowerCase()}
          </button>
        )
      })}
      {children}
    </nav>
  )
}
