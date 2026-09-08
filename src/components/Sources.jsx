import { useRef } from 'react'

// Three plates and your own file, as a line of numerals — no thumbnails, so
// nothing on the page competes with the frame.
export function Sources({ core, srcIndex, onPick }) {
  const fileRef = useRef(null)

  const btn = 'cursor-pointer border-0 bg-none p-0 font-[inherit] transition-colors duration-[250ms] outline-none hover:text-[var(--accent)] focus-visible:text-[var(--accent)]'
  const tone = current => (current ? 'text-ink' : 'text-ink-quarter')

  return (
    <div className="col-start-1 row-start-2 flex gap-[14px] self-end text-[11.5px] max-[900px]:row-start-3">
      {core?.plates.map((pl, i) => (
        <button
          key={pl.name}
          type="button"
          title={pl.name}
          aria-current={i === srcIndex}
          onClick={() => { core.usePlate(i); onPick() }}
          className={`${btn} ${tone(i === srcIndex)}`}
        >
          {String(i + 1).padStart(2, '0')}
        </button>
      ))}

      <button
        type="button"
        aria-current={srcIndex === -1}
        onClick={() => fileRef.current.click()}
        className={`${btn} ${tone(srcIndex === -1)}`}
      >
        your frame
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={e => { core?.loadFile(e.target.files[0]); onPick() }}
        className="absolute h-px w-px opacity-0"
      />
    </div>
  )
}
