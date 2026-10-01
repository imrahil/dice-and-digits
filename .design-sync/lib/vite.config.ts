// Library build of the app's components for the Claude Design sync.
//
//   vite build              -> dist/index.js (ES module, React external)
//   vite build --mode css   -> dist/style.css + font files
//
// Two passes because library mode always inlines assets: the fonts would land
// in style.css as megabytes of base64. The CSS pass is a plain build, so fonts
// stay files next to the stylesheet.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) =>
  mode === 'css'
    ? {
      root: import.meta.dirname,
      base: './', // font url()s relative to style.css, so the sync can find and copy them
      plugins: [tailwindcss()],
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        assetsInlineLimit: 0,
        rollupOptions: {
          input: { style: 'ds.css' },
          output: { assetFileNames: '[name][extname]' },
        },
      },
    }
    : {
      root: import.meta.dirname,
      plugins: [react()],
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        lib: { entry: 'index.ts', formats: ['es'], fileName: 'index' },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
        },
      },
    },
)
