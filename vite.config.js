import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: { port: 5178, open: false },
  build: { outDir: 'dist' },
})
