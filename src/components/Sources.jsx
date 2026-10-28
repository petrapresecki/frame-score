// Your own frame and the three plates, as the boxed toggles badbunnybebefan
// uses for English / Español. The one in use is filled.
// The file input lives here; the empty heart in my picks opens it too.
export function Sources({ core, srcIndex, own, onPick, fileRef }) {

  const tab = on => `cursor-pointer border-[1.5px] px-[7px] font-mono text-[13.5px] leading-[1.45] transition-colors duration-200
                     hover:text-glow ${on ? 'border-ink bg-white text-ink' : 'border-[#888] bg-white/60 text-ink-soft'}`

  return (
    <div className="flex flex-wrap gap-[7px]">
      <button type="button" aria-pressed={own} onClick={() => fileRef.current.click()} className={tab(own)}>
        your own frame
      </button>
      {core?.plates.map((pl, i) => (
        <button
          key={pl.name}
          type="button"
          title={pl.name}
          aria-pressed={i === srcIndex}
          onClick={() => { core.usePlate(i); onPick() }}
          className={tab(i === srcIndex)}
        >
          plate {i + 1}
        </button>
      ))}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden
        onChange={e => { core?.loadFile(e.target.files[0]); onPick() }}
        className="absolute h-px w-px opacity-0"
      />
    </div>
  )
}
