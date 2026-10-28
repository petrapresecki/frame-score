// The three plates drawn in code, at the end of the picks line, and the file
// input that "your own frame" opens.
export function Sources({ core, srcIndex, onPick, fileRef }) {
  return (
    <>
      <span className="mr-[10px] whitespace-nowrap text-mid">
        plates
        {core?.plates.map((pl, i) => (
          <button
            key={pl.name}
            type="button"
            title={pl.name}
            aria-label={pl.name}
            aria-current={i === srcIndex}
            onClick={() => { core.usePlate(i); onPick() }}
            className={`ml-[10px] cursor-pointer border-0 bg-transparent p-0 font-mono text-[12.5px] font-light hover:text-ink
                        ${i === srcIndex ? 'text-ink underline decoration-[var(--tone)] underline-offset-4' : 'text-mid'}`}
          >
            {i + 1}
          </button>
        ))}
      </span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden
        onChange={e => { core?.loadFile(e.target.files[0]); onPick() }}
        className="absolute h-px w-px opacity-0"
      />
    </>
  )
}
