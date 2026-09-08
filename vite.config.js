import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The TMDB key is per-person and must never reach the browser, so the API is
// reached through the dev server, which signs each request. Only the JSON needs
// this — image.tmdb.org is public and sends access-control-allow-origin: *, so
// the frames themselves are fetched straight from the CDN and stay readable by
// getImageData.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    build: { outDir: 'dist' },
    server: {
      port: 5178,
      open: false,
      proxy: {
        '/api/tmdb': {
          target: 'https://api.themoviedb.org',
          changeOrigin: true,
          rewrite: path => {
            const [route, query = ''] = path.replace(/^\/api\/tmdb/, '').split('?')
            const params = new URLSearchParams(query)
            params.set('api_key', env.TMDB_KEY ?? '')
            return `/3${route}?${params}`
          },
        },
      },
    },
  }
})
