import { useCallback, useEffect, useRef, useState } from 'react'
import { Core, expose } from './core.js'

// Core owns a canvas, an imperative Tone.js graph and its own scheduling. None
// of that belongs in React state, so it lives in a ref for its whole life and
// React only ever holds what it needs to draw: the last reading, and whether
// the loop is running.
export function useFrameScore() {
  const canvasRef = useRef(null)
  const [core, setCore] = useState(null)
  const [reading, setReading] = useState(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const c = new Core(canvasRef.current)
    c.on((A, M, self) => setReading({
      A,
      M,
      // a grade set from anywhere still shows on the numerals
      grade: { ...self.G },
      sourceName: self.sourceName,
      srcIndex: self.plates.findIndex(pl => pl.c === self.src),
    }))
    expose(c)             // window.__load / __core, for the measuring harness
    setCore(c)
    c.render()
    return () => c.stop()
  }, [])

  // not core.toggle(): it returns a boolean rather than play()'s promise, so
  // core.playing would still be false on the next line and the loop never starts
  const toggle = useCallback(async () => {
    if (!core) return
    if (core.playing) core.stop()
    else await core.play()
    setPlaying(core.playing)
  }, [core])

  return { canvasRef, core, reading, playing, toggle }
}
