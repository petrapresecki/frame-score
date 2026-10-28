import { useEffect, useRef } from 'react'

// What the piece is, in a panel that slides in over the right of the page and
// back out again — one continuous move, never a page change. Escape, the ×
// or a click outside closes it, and focus goes back to whatever opened it.

const STEPS = [
  ['four bands, four chords', 'The frame is read in four vertical bands, left to right. Each band becomes a chord, taken from the colour that makes it different from the frame as a whole.'],
  ['the brightest points are the tune', 'In every column, the brightest point is a note: the higher it sits in the frame, the higher it sounds. The strongest of them become a short motif, marked ○ on the drawing.'],
  ['colour chooses the mode', 'How much colour the frame holds, and which colour, picks one of five modes, from dark to bright. A pale frame is read by its light instead.'],
  ['light and detail set the pace', 'A bright, detailed frame plays short, quick notes; a soft, hazy one plays long and slow. Depth in the picture becomes the size of the room.'],
]

export function About({ open, onClose }) {
  const panel = useRef(null)
  const back = useRef(null)

  useEffect(() => {
    if (!open) return
    back.current = document.activeElement
    panel.current?.focus()
    const key = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('keydown', key); back.current?.focus?.() }
  }, [open, onClose])

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-[#001a8c]/45 transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        tabIndex={-1}
        inert={!open}
        className={`absolute inset-y-0 right-0 w-[min(460px,100%)] overflow-y-auto border-l border-rule bg-field
                    px-[36px] pb-[40px] pt-[22px] outline-none transition-transform duration-[600ms]
                    ease-[cubic-bezier(.22,1,.36,1)] max-[900px]:px-[20px]
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between">
          <h2 id="about-title" className="m-0 text-[15px] font-normal">about frame score</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="cursor-pointer border-0 bg-transparent p-0 font-ui text-[22px] font-light leading-none text-ink"
          >
            ×
          </button>
        </div>

        <p className="m-0 mt-[34px] text-[22px] font-light leading-[1.3]">
          Grade a film frame, and hear the grade.
        </p>
        <p className="m-0 mt-[14px] text-mid leading-[1.6]">
          Every sound here is read from the picture. Change the exposure, contrast, temperature or saturation and you
          change the pixels — so the music changes with them. You are grading a shot, and the grade is the score.
        </p>

        <h3 className="m-0 mt-[34px] border-b border-rule pb-[8px] text-[13.5px] font-light text-mid">how a frame is read</h3>
        <ol className="m-0 list-none p-0">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[28px_1fr] border-b border-rule py-[14px]">
              <span className="text-mid tabular-nums">{i + 1}</span>
              <span>
                <span className="block font-normal">{t}</span>
                <span className="mt-[4px] block leading-[1.55] text-mid">{d}</span>
              </span>
            </li>
          ))}
        </ol>

        <h3 className="m-0 mt-[34px] border-b border-rule pb-[8px] text-[13.5px] font-light text-mid">what you can do</h3>
        <ul className="m-0 list-none p-0 leading-[1.55]">
          <li className="border-b border-rule py-[12px]">Drag a grade number left or right, or focus it and use the arrow keys. Backspace, or ↺, puts it back to 25.</li>
          <li className="border-b border-rule py-[12px]">Pick a film below the frame, search for any film, or drop a still of your own onto the frame.</li>
          <li className="border-b border-rule py-[12px]">Press play. The bar being heard lights up, and each note rings on the drawing as it is struck.</li>
        </ul>

        <p className="m-0 mt-[34px] leading-[1.6] text-mid">
          It stays ambient on purpose: four slow voices that never line up the same way twice, everything held in one
          key, no beat. The picture decides; nothing is added on top of it.
        </p>
        <p className="m-0 mt-[22px] text-[12.5px] leading-[1.6] text-mid">
          Piece no. 1 of a personal practice between fashion, art, music and design. Film stills via TMDB. Set in Jura.
        </p>
      </aside>
    </div>
  )
}
