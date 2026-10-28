import { PICKS } from '../picks.js'

// My picks, listed down the right side of the bay — titles only, no
// thumbnails, so nothing on the page competes with the frame.
export function Picks({ film, onFilm }) {
  return (
    <nav
      aria-label="my picks"
      className="col-start-3 row-start-1 self-center text-[11.5px]
                 max-[900px]:col-start-1 max-[900px]:row-start-4 max-[900px]:mt-[22px] max-[900px]:self-start"
    >
      <p className="m-0 mb-[10px] text-ink-quarter">my picks</p>
      <ul className="m-0 flex list-none flex-col gap-[7px] p-0 max-[900px]:flex-row max-[900px]:flex-wrap max-[900px]:gap-x-[14px]">
        {PICKS.map(f => {
          const current = film?.id === f.id
          return (
            <li key={f.id}>
              <button
                type="button"
                aria-current={current}
                onClick={() => onFilm(f)}
                className={`cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 text-left font-[inherit]
                            text-[11.5px] outline-none transition-colors duration-[250ms]
                            hover:text-[var(--accent)] focus-visible:text-[var(--accent)]
                            ${current ? 'text-ink' : 'text-ink-half'}`}
              >
                {f.title}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
