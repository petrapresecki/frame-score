import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrameScore } from './useFrameScore.js'
import { useBand } from './useBand.js'
import { chordName, keyName, tempoWord, shortName } from './names.js'
import { shot, shotsFor } from './tmdb.js'
import { triage } from './triage.js'
import { Reel } from './components/Reel.jsx'
import { PrinterPoints } from './components/PrinterPoints.jsx'
import { Sources } from './components/Sources.jsx'
import { Search } from './components/Search.jsx'
import { Picks } from './components/Picks.jsx'
import { Reading } from './components/Reading.jsx'
import { Ticker } from './components/Ticker.jsx'

export default function App() {
  const { canvasRef, core, reading, playing, toggle } = useFrameScore()
  const band = useBand(core, playing)
  const [shots, setShots] = useState([])
  const [index, setIndex] = useState(0)   // what the reel is showing
  const [film, setFilm] = useState(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [heard, setHeard] = useState({})  // how each pick played, once it has been
  const [still, setStill] = useState(null) // the source, small, for the wallpaper and the silhouettes
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

  // The wallpaper is the shot itself, ungraded, tiled small behind everything —
  // taken from the source canvas once per source, never per grade.
  useEffect(() => {
    if (!core?.src) return
    const c = document.createElement('canvas')
    c.width = 300; c.height = 169
    c.getContext('2d').drawImage(core.src, 0, 0, 300, 169)
    const url = c.toDataURL('image/jpeg', 0.7)
    document.body.classList.add('wallpaper')
    document.body.style.setProperty('--still', `url(${url})`)
    setStill(url)
  }, [core, sourceName])

  // a pick remembers how it played, so its heart can say so afterwards
  useEffect(() => {
    if (!film?.stills || !M || sourceName !== film.title) return
    setHeard(h => ({ ...h, [film.title]: { key: keyName(M), tempo: tempoWord(M.activity) } }))
  }, [film, M, sourceName])

  const chords = useMemo(() => M ? M.prog.map(c => chordName(c.deg)) : [], [M])
  // Everything that names the frame names what is at the gate. A film whose
  // reel is open but not yet picked from is not playing — the frame before it is.
  const shown = film && sourceName?.startsWith(film.title) ? film : null
  const name = shown?.title ?? shortName(sourceName)
  const own = reading?.srcIndex === -1 && !shown

  useEffect(() => { document.title = name ? `${name.toLowerCase()} · frame score` : 'frame score' }, [name])

  const ticker = !M ? 'frame score'
    : playing && band !== null
      ? `now playing ${name} ♡ bar ${band + 1} of 4 · ${chords[band]} ♡ ${tempoWord(M.activity)} ♡ notes of ${M.noteLen.toFixed(2)} s ♡ ${keyName(M)}`
      : `press play ♡ ${name} is in ${keyName(M)} ♡ grade it, hear it ♡ made by frame score`

  const credit = shown ? `still: ${shown.by ?? 'tmdb'}${shown.year ? `, ${shown.year}` : ''}`
    : own ? 'still: yours' : 'drawn in code'

  return (
    <main className="mx-auto max-w-[1600px] px-[28px] pb-[52px] pt-[18px] max-[900px]:px-[12px] max-[900px]:pt-[12px]">
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <clipPath id="heart" clipPathUnits="objectBoundingBox">
            <path d="M.5 .2C.4 0 .05 0 .02 .3C0 .55 .3 .78 .5 1C.7 .78 1 .55 .98 .3C.95 0 .6 0 .5 .2z" />
          </clipPath>
          <symbol id="star" viewBox="0 0 20 20">
            <path d="M10 0l1.6 8.4L20 10l-8.4 1.6L10 20l-1.6-8.4L0 10l8.4-1.6z" fill="#fff" stroke="#111" strokeWidth=".6" />
          </symbol>
        </defs>
      </svg>

      <header className="flex items-stretch gap-[18px] max-[900px]:flex-col max-[900px]:gap-[10px]">
        <div className="glow-bar flex flex-1 items-center rounded-[8px] px-[18px] pb-[10px] pt-[8px]">
          <h1 className="glow-text m-0 font-pixel text-[clamp(24px,2.7vw,40px)] font-bold leading-[1.05] tracking-[.02em]">
            these are the 4 chords of {name.toLowerCase()}.
          </h1>
        </div>
        <div className="flex w-[352px] flex-col justify-center gap-[6px] max-[900px]:w-auto">
          <Search onFilm={onFilm} busy={busy} />
          <Sources core={core} srcIndex={reading?.srcIndex ?? 0} own={own} onPick={clearReel} fileRef={fileRef} />
        </div>
      </header>

      <div
        ref={panelRef}
        className="glass relative mt-[20px] scroll-mt-[12px] grid grid-cols-[var(--gate)_minmax(0,1fr)] gap-[34px] rounded-[26px] p-[22px]
                   max-[900px]:grid-cols-1 max-[900px]:gap-[20px] max-[900px]:rounded-[18px] max-[900px]:p-[12px]"
        style={{ '--gate': 'min(62%, clamp(420px, calc((100svh - 590px) * 16 / 9), 980px))' }}
      >
        {['-left-[11px] -top-[11px]', '-right-[11px] -top-[11px]', '-left-[11px] -bottom-[11px]', '-right-[11px] -bottom-[11px]'].map(p => (
          <svg key={p} aria-hidden className={`absolute h-[22px] w-[22px] ${p}`}><use href="#star" /></svg>
        ))}

        <section aria-label="the frame and its grade" className="min-w-0">
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
            chords={chords}
            band={band}
          >
            {M && (
              <span className="text-[16px]">
                this frame is <s className="decoration-glow decoration-2">a picture</s> a song in{' '}
                <em className="font-serif text-[19px]">{keyName(M)}</em>
              </span>
            )}
            <span className="ml-auto -rotate-3 font-serif text-[13px] italic text-ink-soft max-[900px]:ml-0">{credit}</span>
          </Reel>

          <PrinterPoints core={core} grade={reading?.grade ?? {}} onGesture={() => {}} />
        </section>

        <Reading
          reading={reading}
          band={band}
          still={still}
          title={shown ? <>{shown.title}{shown.by ? <> <i>by</i> {shown.by}</> : shown.year ? `, ${shown.year}` : ''}</> : name}
        />
      </div>

      <Picks film={shown} heard={heard} onFilm={onFilm} onOwn={() => fileRef.current?.click()} />

      <Ticker text={ticker} />
    </main>
  )
}
