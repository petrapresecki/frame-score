import { useCallback, useEffect, useRef, useState } from 'react'
import { useFrameScore } from './useFrameScore.js'
import { useBand } from './useBand.js'
import { accentFrom } from './accent.js'
import { keyName, tempoWord, shortName } from './names.js'
import { shot, shotsFor } from './tmdb.js'
import { triage } from './triage.js'
import { PICKS } from './picks.js'
import { Reel } from './components/Reel.jsx'
import { PrinterPoints } from './components/PrinterPoints.jsx'
import { Search } from './components/Search.jsx'
import { Picks } from './components/Picks.jsx'
import { Contours } from './components/Contours.jsx'
import { Bars } from './components/Bars.jsx'
import { About } from './components/About.jsx'

export default function App() {
  const { canvasRef, core, reading, playing, toggle } = useFrameScore()
  const [band, beat] = useBand(core, playing)
  const [shots, setShots] = useState([])
  const [index, setIndex] = useState(0)   // what the reel is showing
  const [film, setFilm] = useState(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [about, setAbout] = useState(false)
  const closeAbout = useCallback(() => setAbout(false), [])
  const fileRef = useRef(null)
  const panelRef = useRef(null)

  // A pick made from the hearts at the foot of a phone screen changes a frame
  // that is out of sight. Bring it back with one continuous move — never a jump.
  const reveal = useCallback(() => {
    const el = panelRef.current
    if (!el || el.getBoundingClientRect().top >= 0) return
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
  }, [])

  const onFilm = useCallback(async f => {
    // one of my picks: its stills were chosen by hand, so they keep their
    // order, and a single still has nothing to choose between — it goes
    // straight to the gate
    if (f.stills) {
      const s = f.stills.map(shot)
      setFilm(f)
      reveal()
      if (s.length === 1) {
        setShots([]); setIndex(0); setOpen(false)
        core?.loadURL(s[0].gate, f.title).catch(e => console.warn(e.message))
      } else {
        setShots(s); setIndex(0); setOpen(true)
      }
      return
    }

    setBusy(true)
    setFilm(f)
    try {
      // measured before the reel is shown, so the order never rearranges itself
      // under a hand that is already spinning it
      const s = await triage(await shotsFor(f.id))
      setShots(s)
      setIndex(0)
      setOpen(true)
    } finally {
      setBusy(false)
    }
  }, [core, reveal])

  // The page opens on the first of my picks, After Hours, rather than a plate.
  // Once only: a plate or a film chosen after that is left alone.
  const opened = useRef(false)
  useEffect(() => {
    if (!core || opened.current) return
    opened.current = true
    onFilm(PICKS[0])
  }, [core, onFilm])

  // The gate is reached here and nowhere else. Loading goes through the same
  // path a dropped file takes, so the printer points, the analysis and the
  // engine cannot tell a picked shot from a dropped one.
  const onPick = useCallback(i => {
    const s = shots[i]
    if (!core || !s) return
    setOpen(false)
    core.loadURL(s.gate, `${film?.title ?? 'frame'} · ${String(i + 1).padStart(2, '0')}`)
      .catch(e => console.warn(e.message))
  }, [core, shots, film])

  // a plate or a dropped file takes the reel away — there is no reel to be at
  // shot 3 of once the source is something else
  const clearReel = useCallback(() => {
    setShots([]); setIndex(0); setFilm(null); setOpen(false)
  }, [])

  const sourceName = reading?.sourceName
  const M = reading?.M

  // Everything that names the frame names what is at the gate. A film whose
  // reel is open but not yet picked from is not playing — the frame before it is.
  const shown = film && sourceName?.startsWith(film.title) ? film : null
  const name = shown?.title ?? shortName(sourceName)
  const own = reading?.srcIndex === -1 && !shown

  useEffect(() => { document.title = name ? `${name.toLowerCase()} · frame score` : 'frame score' }, [name])

  const credit = shown ? `still: ${shown.by ?? 'tmdb'}${shown.year ? `, ${shown.year}` : ''}`
    : own ? 'still: yours' : 'a plate, drawn in code'

  return (
    <main
      style={{ '--tone': accentFrom(reading?.A) }}
      className="mx-auto max-w-[1440px] px-[45px] pb-[40px] pt-[18px] max-[900px]:px-[16px] max-[900px]:pt-[12px]"
    >
      <header className="flex h-[40px] items-center justify-between gap-[20px]">
        {/* the name, with one bar per band; the one being heard is filled */}
        <h1 className="m-0 flex items-center gap-[10px] whitespace-nowrap text-[15px] font-normal">
          <span aria-hidden className="flex h-[16px] gap-[2px]">
            {[0, 1, 2, 3].map(i => (
              <i key={i} className={`block w-[4px] border transition-colors duration-300
                                     ${band === i ? 'border-[var(--tone)] bg-[var(--tone)]' : 'border-ink'}`} />
            ))}
          </span>
          frame score
        </h1>
        <nav className="flex items-center gap-[48px] max-[900px]:gap-[14px]">
          <div className="w-[240px] max-[900px]:w-[96px]"><Search onFilm={onFilm} busy={busy} /></div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 font-ui text-[13.5px] font-light hover:text-ink max-[900px]:hidden
                        ${own ? 'text-ink underline decoration-[var(--tone)] underline-offset-4' : 'text-mid'}`}
          >
            your own frame
          </button>
          <button
            type="button"
            aria-expanded={about}
            onClick={() => setAbout(true)}
            className="cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 font-ui text-[13.5px] font-light text-mid hover:text-ink"
          >
            about
          </button>
          {/* the file input "your own frame" opens; a dropped file goes the same way */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            tabIndex={-1}
            aria-hidden
            onChange={e => { core?.loadFile(e.target.files[0]); clearReel() }}
            className="absolute h-px w-px opacity-0"
          />
        </nav>
      </header>

      <div
        ref={panelRef}
        className="mt-[26px] grid scroll-mt-[12px] grid-cols-[minmax(0,800px)_minmax(0,1fr)] gap-[44px]
                   max-[900px]:grid-cols-1 max-[900px]:gap-[26px]"
      >
        <section aria-label="the frame" className="min-w-0">
          <Reel
            core={core}
            canvasRef={canvasRef}
            playing={playing}
            shots={shots}
            index={index}
            open={open}
            onOpen={setOpen}
            onIndex={setIndex}
            onPick={onPick}
            onToggle={toggle}
            band={band}
          >
            {M && <span className="flex-1">{keyName(M)} · {tempoWord(M.activity)} · {M.motif.length} notes</span>}
            <span className="text-mid max-[900px]:basis-full">{credit}</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="hidden cursor-pointer border-0 bg-transparent p-0 font-ui text-[13.5px] font-light text-mid underline
                         decoration-rule underline-offset-4 hover:text-ink max-[900px]:inline"
            >
              or grade your own frame
            </button>
          </Reel>
          <Picks film={shown} onFilm={onFilm} />
        </section>

        <section aria-label="what the frame reads as" className="min-w-0">
          <Contours core={core} canvasRef={canvasRef} reading={reading} />
          <PrinterPoints core={core} grade={reading?.grade ?? {}} onGesture={() => {}} />
        </section>
      </div>

      <Bars reading={reading} band={band} beat={beat} />
      <About open={about} onClose={closeAbout} />
    </main>
  )
}
