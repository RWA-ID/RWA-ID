import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Multi-page build: the docs and legal routes ship as real HTML so crawlers and
// share scrapers (which never run JS) see per-route titles and OG cards. Each
// entry boots the same SPA, which routes on pathname.
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      input: {
        main:    resolve(__dirname, 'index.html'),
        docs:    resolve(__dirname, 'docs/index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
        terms:   resolve(__dirname, 'terms/index.html'),
        refunds: resolve(__dirname, 'refunds/index.html'),
      },
    },
  },
})
