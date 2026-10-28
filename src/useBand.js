import { useEffect, useState } from 'react'

// Which band the engine is playing, as the engine says it — never worked out
// from the transport (see CLAUDE.md). null while the loop is stopped.
export function useBand(core, playing) {
  const [band, setBand] = useState(null)

  useEffect(() => {
    if (!core) return
    return core.tap(e => { if (e.k === 'band') setBand(e.band) })
  }, [core])

  useEffect(() => { if (!playing) setBand(null) }, [playing])

  return playing ? band : null
}
