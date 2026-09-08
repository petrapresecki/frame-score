import { useEffect, useRef, useState } from 'react'
import { searchFilms } from '../tmdb.js'

// A film title, and the reel it loads. Set as a caption, not as a search
// engine: one rule, no box, no button — the field is a line you type on.
export function Search({ onFilm, busy, film }) {
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
        className="w-full border-0 border-b border-rule-faint bg-transparent pb-[7px]
                   font-[inherit] text-[11.5px] text-ink outline-none
                   transition-colors duration-[250ms]
                   placeholder:text-ink-quarter
                   focus:border-[var(--accent)]"
      />

      {/* what is loaded, held under the rule where the tape's own labels sit */}
      <p className="m-0 mt-[7px] flex items-baseline gap-[8px] text-[11.5px] text-ink-quarter">
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {err ?? (busy ? 'reading…' : film ? `${film.title}${film.year ? ` · ${film.year}` : ''}` : 'or drop a frame')}
        </span>
      </p>

      {open && list.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-[30px] z-50 m-0 list-none rounded-[2px]
                     bg-field-deep p-[6px] text-[11.5px] shadow-[0_10px_30px_rgba(0,0,0,.35)]"
        >
          {list.map(f => (
            <li key={f.id}>
              <button
                type="button"
                // onMouseDown, not onClick: the input's blur would close the
                // list before a click ever landed
                onMouseDown={e => { e.preventDefault(); pick(f) }}
                className="block w-full cursor-pointer truncate border-0 bg-transparent px-[6px] py-[5px]
                           text-left font-[inherit] text-[11.5px] text-ink-half outline-none
                           transition-colors duration-150 hover:text-[var(--accent)] focus-visible:text-[var(--accent)]"
              >
                {f.title}
                {f.year && <i className="not-italic text-ink-quarter"> · {f.year}</i>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
