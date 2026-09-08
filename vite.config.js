import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const here = p => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  base: './',
  server: { port: 5178, open: false },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        instrument: here('index.html'),
        a: here('direction-a.html'),
        a2: here('direction-a2.html'),
        b: here('direction-b.html'),
        c: here('direction-c.html'),
      },
    },
  },
})
