import { useSyncExternalStore } from 'react'

/**
 * Hash routing: GitHub Pages serves one index.html, and hash links survive
 * being opened from a share sheet or a home-screen PWA.
 */
function subscribe(l: () => void) {
  window.addEventListener('hashchange', l)
  return () => window.removeEventListener('hashchange', l)
}

const current = () => window.location.hash.replace(/^#\/?/, '')

export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribe, current)
  return hash.split('?')[0].split('/').filter(Boolean).map(decodeURIComponent)
}

// Pushes made by the app itself: going "back" past them would leave the app
// (e.g. when a live link was opened straight from a chat).
let depth = 0

export function navigate(path: string, { replace = false } = {}) {
  const target = '#/' + path.replace(/^\/+/, '')
  if (replace) window.location.replace(target)
  else {
    depth++
    window.location.hash = target
  }
  window.scrollTo(0, 0)
}

export function goBack(fallback = '') {
  if (depth > 0) {
    depth--
    window.history.back()
  } else navigate(fallback, { replace: true })
}
