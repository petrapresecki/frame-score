import { useEffect, useRef, useState } from 'react'
import { searchFilms } from '../tmdb.js'

// A film title, and the reel it loads. A plain boxed field, as on
// thinkinboutyou: no icon, no button — Enter takes the first match.
export function Search({ onFilm, busy }) {
  const [q, setQ] = useState('')
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState(null)
  const seq = useRef(0)

  useEffect(() => {
    if (!q.trim()) { setList([]); setErr(null); return }
    const mine = ++seq.current
    const t = setTimeout(async () => {
      try {
        const r = await searchFilms(q)
        if (mine === seq.current) { setList(r); setOpen(true); setErr(null) }
      } catch (e) {
        if (mine === seq.current) { setErr(e.message); setList([]) }
      }
    }, 260)
    return () => clearTimeout(t)
  }, [q])

  const pick = f => {
    setQ('')
    setList([])
    setOpen(false)
    onFilm(f)
  }

  return (
    <div className="relative">
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={e => {
          if (e.key === 'Enter' && list[0]) { e.preventDefault(); pick(list[0]) }
          if (e.key === 'Escape') { setQ(''); setOpen(false); e.currentTarget.blur() }
        }}
        placeholder="search a film"
        aria-label="search a film"
        spellCheck={false}
        className="w-full border-[1.5px] border-ink bg-white/80 px-[10px] py-[7px]
                   font-mono text-[14px] text-ink outline-none
                   placeholder:text-ink-soft
                   focus:bg-white focus:shadow-[inset_0_0_0_3px_#f3d7ff]"
      />

      {/* only says something when there is something to say */}
      {(err || busy) && (
        <p role="status" className="m-0 mt-[5px] font-mono text-[12.5px] italic text-ink-soft">
          {err ?? 'reading the reel…'}
        </p>
      )}

      {open && list.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-[38px] z-50 m-0 list-none border-[1.5px] border-ink
                     bg-white p-[4px] text-[14px] shadow-[0_10px_30px_rgba(60,0,40,.25)]"
        >
          {list.map(f => (
            <li key={f.id}>
              <button
                type="button"
                // onMouseDown, not onClick: the input's blur would close the
                // list before a click ever landed
                onMouseDown={e => { e.preventDefault(); pick(f) }}
                className="block w-full cursor-pointer truncate border-0 bg-transparent px-[6px] py-[4px]
                           text-left font-mono text-[14px] text-ink outline-none
                           hover:bg-blush hover:text-glow"
              >
                {f.title}
                {f.year && <i className="text-ink-soft"> · {f.year}</i>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
