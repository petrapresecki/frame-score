// The production twin of the dev-server proxy in vite.config.js: signs TMDB
// requests with the key, which is a Pages secret (TMDB_KEY) and never reaches
// the browser.
//
// Only the two questions src/tmdb.js asks are let through, so the key cannot be
// borrowed as a general TMDB proxy.

const ROUTES = [/^search\/movie$/, /^movie\/\d+\/images$/]

export async function onRequestGet({ request, params, env }) {
  const route = (params.path ?? []).join('/')
  if (!ROUTES.some(r => r.test(route))) return new Response('Not found', { status: 404 })
  if (!env.TMDB_KEY) return new Response('TMDB_KEY is not set', { status: 500 })

  const q = new URL(request.url).searchParams
  q.set('api_key', env.TMDB_KEY)
  const r = await fetch(`https://api.themoviedb.org/3/${route}?${q}`, {
    cf: { cacheTtl: 86400, cacheEverything: true },
  })

  return new Response(r.body, {
    status: r.status,
    headers: {
      'content-type': r.headers.get('content-type') ?? 'application/json',
      'cache-control': 'public, max-age=3600',
    },
  })
}
