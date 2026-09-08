import { useState } from 'react'
import { useFrameScore } from './useFrameScore.js'
import { accentFrom } from './accent.js'
import { Tape } from './components/Tape.jsx'
import { Frame } from './components/Frame.jsx'
import { PrinterPoints } from './components/PrinterPoints.jsx'
import { Sources } from './components/Sources.jsx'

export default function App() {
  const { canvasRef, core, reading, playing, toggle } = useFrameScore()
  const [cueGone, setCueGone] = useState(false)
  const dismissCue = () => setCueGone(true)

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
      {/* the tape: what the instrument has measured, printed on its own face */}
      <Tape reading={reading} />

      {/* the frame is the transport */}
      <Frame
        core={core}
        canvasRef={canvasRef}
        playing={playing}
        cueGone={cueGone}
        onToggle={() => { dismissCue(); toggle() }}
      />

      <PrinterPoints core={core} grade={reading?.grade ?? {}} onGesture={dismissCue} />

      <Sources core={core} srcIndex={reading?.srcIndex ?? 0} onPick={dismissCue} />
    </main>
  )
}
