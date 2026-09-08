import { useCallback, useState } from 'react'
import { useFrameScore } from './useFrameScore.js'
import { accentFrom } from './accent.js'
import { shotsFor } from './tmdb.js'
import { triage } from './triage.js'
import { Tape } from './components/Tape.jsx'
import { Reel } from './components/Reel.jsx'
import { PrinterPoints } from './components/PrinterPoints.jsx'
import { Sources } from './components/Sources.jsx'
import { Search } from './components/Search.jsx'

export default function App() {
  const { canvasRef, core, reading, playing, toggle } = useFrameScore()
  const [cueGone, setCueGone] = useState(false)
  const [shots, setShots] = useState([])
  const [index, setIndex] = useState(0)   // what the reel is showing
  const [film, setFilm] = useState(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const dismissCue = () => setCueGone(true)

  const onFilm = useCallback(async f => {
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
  }, [])

  // The gate is reached here and nowhere else. Loading goes through the same
  // path a dropped file takes, so the printer points, the analysis and the
  // engine cannot tell a picked shot from a dropped one.
  const onPick = useCallback(i => {
    const s = shots[i]
    if (!core || !s) return
    setOpen(false)
    dismissCue()
    core.loadURL(s.gate, `${film?.title ?? 'frame'} · ${String(i + 1).padStart(2, '0')}`)
      .catch(e => console.warn(e.message))
  }, [core, shots, film])

  // a plate or a dropped file takes the reel away — there is no reel to be at
  // shot 3 of once the source is something else
  const clearReel = useCallback(() => {
    setShots([]); setIndex(0); setFilm(null); setOpen(false); dismissCue()
  }, [])

  return (
    // Asymmetric on purpose: the tape is a narrow fixed column, the frame sits
    // right of centre, and the points run under it. Nothing is centred.
    <main
      style={{ '--accent': accentFrom(reading?.A) }}
      className="fixed inset-0 grid grid-cols-[232px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto]
                 gap-x-[clamp(24px,5vw,88px)] px-[34px] pt-[26px] pb-[22px]
                 max-[900px]:grid-cols-1 max-[900px]:grid-rows-[auto_minmax(0,1fr)_auto]
                 max-[900px]:px-5 max-[900px]:py-[18px]"
    >
      <div className="col-start-1 row-start-1 flex min-h-0 flex-col gap-[20px]">
        <Search onFilm={onFilm} busy={busy} film={film} />
        {/* the tape: what the instrument has measured, printed on its own face */}
        <Tape reading={reading} />
      </div>

      {/* the reel hangs in front of the bay; only a pick reaches the gate */}
      <Reel
        core={core}
        canvasRef={canvasRef}
        playing={playing}
        cueGone={cueGone}
        shots={shots}
        index={index}
        open={open}
        onOpen={setOpen}
        onIndex={setIndex}
        onPick={onPick}
        onToggle={() => { dismissCue(); toggle() }}
      />

      <PrinterPoints core={core} grade={reading?.grade ?? {}} onGesture={dismissCue} />

      <Sources core={core} srcIndex={reading?.srcIndex ?? 0} onPick={clearReel} />
    </main>
  )
}
