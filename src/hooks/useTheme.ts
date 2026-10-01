import { useEffect } from 'react'
import type { Theme } from '../types'

const COLORS = { light: '#f6f1e7', dark: '#14111d' }

/**
 * Toggles .dark on <html>. The inline script in index.html does the same
 * before first paint — change one, change the other.
 */
export function useTheme(theme: Theme) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach((m) => (m.content = dark ? COLORS.dark : COLORS.light))
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}
