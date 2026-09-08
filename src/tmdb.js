// TMDB, reduced to the two questions this piece asks: which film, and what are
// its frames.
//
// The key lives on the dev server (see vite.config.js) and is never shipped to
// the browser. Images come straight from the CDN, which is public and
// CORS-open — that matters, because a tainted canvas cannot be measured.

const API = '/api/tmdb'
const CDN = 'https://image.tmdb.org/t/p'

// Wide enough to fill the gate on a large display, small enough that spinning
// through thirty of them is not a download. The Core fits everything to
// 1024×576 anyway, so w1280 is already more than the analysis can use.
const GATE = 'w1280'
const REEL = 'w780'
const PROBE = 'w300'    // enough to average four bands; see triage.js

async function get(route, params = {}) {
  const q = new URLSearchParams(params)
  const r = await fetch(`${API}${route}?${q}`)
  if (!r.ok) throw new Error(`TMDB ${r.status}${r.status === 401 ? ' — check TMDB_KEY in .env' : ''}`)
  return r.json()
}

export async function searchFilms(query) {
  if (!query.trim()) return []
  const d = await get('/search/movie', { query, include_adult: 'false' })
  return d.results
    .filter(f => f.backdrop_path)          // no backdrop, no frames to show
    .slice(0, 7)
    .map(f => ({
      id: f.id,
      title: f.title,
      year: (f.release_date ?? '').slice(0, 4),
    }))
}

// Backdrops are a mixed bag: some are frames, some are key art with the cast
// composited against a split-toned background. iso_639_1 is TMDB's marker for
// text burned into the image, so dropping the non-null ones removes titles and
// credits. It does not remove key art — nothing in the metadata does — which is
// why the reel is worth looking through rather than trusting blind.
export async function shotsFor(id, max = 30) {
  const d = await get(`/movie/${id}/images`)
  return (d.backdrops ?? [])
    .filter(b => b.iso_639_1 === null && b.aspect_ratio > 1.6)
    .sort((a, b) => b.vote_count - a.vote_count)
    .slice(0, max)
    .map((b, i) => ({
      id: b.file_path,
      n: i,
      probe: CDN + '/' + PROBE + b.file_path,
      reel: CDN + '/' + REEL + b.file_path,
      gate: CDN + '/' + GATE + b.file_path,
    }))
}
