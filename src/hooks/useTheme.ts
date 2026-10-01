import { useEffect } from 'react'
import type { Skin, Theme } from '../types'

/** Browser chrome colour: each skin's page background, light and dark. */
const COLORS: Record<Skin, { light: string; dark: string }> = {
  arcade: { light: '#f0ebff', dark: '#0f0b17' },
  bubble: { light: '#fbefff', dark: '#150a24' },
  classic: { light: '#f6f1e7', dark: '#14111d' },
}

/**
 * Toggles .dark and sets data-skin on <html>. The inline script in index.html
 * does the same before first paint — change one, change the other.
 */
export function useTheme(theme: Theme, skin: Skin) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && mq.matches)
      const colors = COLORS[skin] ?? COLORS.arcade

      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.dataset.skin = skin
      document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach((m) => (m.content = dark ? colors.dark : colors.light))
    }

    apply()
    mq.addEventListener('change', apply)

    return () => mq.removeEventListener('change', apply)
  }, [theme, skin])
}
