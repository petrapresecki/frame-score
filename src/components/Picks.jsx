import { PICKS } from '../picks.js'
import { shot } from '../tmdb.js'

// My picks, as the row of heart-cropped crushes on do-you-have-a-crush-on.me,
// each with its name written under it. A pick says how it plays only once it
// has been heard — reading it in advance would disturb the analysis' memory of
// the frame that is actually at the gate — so until then it says who made it.
// The last heart is empty: it is where your own frame goes.
export function Picks({ film, heard, onFilm, onOwn }) {
  return (
    <section aria-labelledby="crushes" className="mt-[22px]">
      <h3 id="crushes" className="m-0 font-pixel text-[22px] font-bold tracking-[.03em]">these are my frame crushes:</h3>
      <ul className="m-0 mt-[8px] flex list-none flex-wrap gap-[18px] p-0 max-[900px]:justify-between max-[900px]:gap-[10px]">
        {PICKS.map(f => {
          const current = film?.id === f.id
          const h = heard[f.title]
          return (
            <li key={f.id} className="w-[132px] text-center max-[900px]:w-[30%]">
              <button
                type="button"
                aria-current={current}
                onClick={() => onFilm(f)}
                className="group block w-full cursor-pointer border-0 bg-transparent p-0 text-ink outline-none"
              >
                <span className="heart-glow block transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-[1.04] group-focus-visible:scale-[1.06]">
                  <span
                    className="heart-clip block aspect-[132/118] w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${shot(f.stills[0]).probe})` }}
                  />
                </span>
                <span className={`mt-[3px] block font-pixel text-[13px] font-bold leading-tight
                                  ${current ? 'text-glow [text-shadow:0_0_6px_#fff]' : ''}
                                  group-focus-visible:underline`}>
                  {f.title.toLowerCase()}
                </span>
                <i className={`block text-[12px] ${current ? 'text-glow' : ''}`}>
                  {h ? `${h.key}, ${h.tempo}` : `${f.by}, ${f.year}`}
                </i>
              </button>
            </li>
          )
        })}
        <li className="w-[132px] text-center max-[900px]:w-[30%]">
          <button type="button" onClick={onOwn} className="group block w-full cursor-pointer border-0 bg-transparent p-0 text-ink outline-none">
            <span className="heart-glow block transition-transform duration-300 group-hover:-rotate-3 group-focus-visible:scale-[1.06]">
              <span className="heart-clip block aspect-[132/118] w-full bg-white" />
            </span>
            <span className="mt-[3px] block font-pixel text-[13px] font-bold leading-tight group-focus-visible:underline">your own frame</span>
            <i className="block text-[12px]">drop it on the frame</i>
          </button>
        </li>
      </ul>
    </section>
  )
}
