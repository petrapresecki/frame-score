import { PICKS } from '../picks.js'
import { shot } from '../tmdb.js'

// My picks, as a row of labelled stills under the frame — title, who made it,
// the year — so the way into the piece is in sight. The one at the gate is
// underlined in the tone. On a phone the row scrolls sideways.
export function Picks({ film, onFilm }) {
  return (
    <nav aria-label="my picks" className="mt-[30px]">
      <p className="m-0 mb-[10px] text-mid">my picks</p>
      <ul className="m-0 grid list-none grid-cols-5 gap-[14px] p-0
                     max-[900px]:-mx-[16px] max-[900px]:flex max-[900px]:snap-x max-[900px]:overflow-x-auto max-[900px]:px-[16px] max-[900px]:scroll-px-[16px]">
        {PICKS.map(f => {
          const current = film?.id === f.id
          return (
            <li key={f.id} className="min-w-0 max-[900px]:w-[150px] max-[900px]:shrink-0 max-[900px]:snap-start">
              <button
                type="button"
                aria-current={current}
                onClick={() => onFilm(f)}
                className="group block w-full cursor-pointer border-0 bg-transparent p-0 text-left font-mono text-ink"
              >
                <img
                  src={shot(f.stills[0]).probe}
                  alt=""
                  loading="lazy"
                  className={`block aspect-video w-full object-cover transition-opacity duration-300
                              ${current ? 'opacity-100' : 'opacity-75 group-hover:opacity-100'}`}
                />
                <span className={`mt-[7px] block truncate border-b-2 pb-[3px] text-[12.5px] font-normal
                                  ${current ? 'border-[var(--tone)]' : 'border-transparent group-hover:border-rule'}`}>
                  {f.title.toLowerCase()}
                </span>
                <span className="mt-[2px] block truncate text-[11.5px] text-mid">{f.by.toLowerCase()}, {f.year}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
