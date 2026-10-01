/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    // Offline matters here (game night in a basement), so the bundle is
    // precached. 'prompt' rather than 'autoUpdate': a silent reload in the
    // middle of a game would be jarring, so App shows an "update ready" banner
    // and the new version takes over when the user taps it.
    VitePWA({
      registerType: 'prompt',
      manifest: false, // public/manifest.json is the source of truth
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,json}'],
        // Polish needs latin-ext; the other Nunito subsets load on demand via
        // unicode-range and aren't worth precaching.
        globIgnores: ['**/*cyrillic*', '**/*vietnamese*'],
        navigateFallback: 'index.html',
        // The API is live data: never let the SW answer for it.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'src/main.tsx'],
      reporter: ['text-summary', 'text', 'html'],
    },
  },
})
