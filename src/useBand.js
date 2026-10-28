import { useEffect, useState } from 'react'

// Which band the engine is playing, as the engine says it — never worked out
// from the transport (see CLAUDE.md) — and how many band changes there have
// been, so anything that animates over one bar can start again on the next.
// band is null while the loop is stopped.
export function useBand(core, playing) {
  const [state, setState] = useState({ band: null, beat: 0 })

  useEffect(() => {
    if (!core) return
    return core.tap(e => { if (e.k === 'band') setState(s => ({ band: e.band, beat: s.beat + 1 })) })
  }, [core])

  useEffect(() => { if (!playing) setState(s => ({ ...s, band: null })) }, [playing])

  return [playing ? state.band : null, state.beat]
}
