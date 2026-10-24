import { useEffect } from 'react'
import { useStore } from '../lib/store'
import { cloudEnabled, syncNow, useCloud } from '../lib/cloud'

/** Sync on open, on return to the tab, shortly after local changes, and every 5 min. */
export function useAutoSync() {
  const dirty = useStore((s) => s.dirty)
  const { group } = useCloud()
  const hasGroup = Boolean(group)

  useEffect(() => {
    if (!cloudEnabled || !hasGroup) {
      return
    }

    syncNow()
    const onVisible = () => document.visibilityState === 'visible' && syncNow()
    const onOnline = () => syncNow()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    const id = setInterval(() => document.visibilityState === 'visible' && syncNow(), 5 * 60_000)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      clearInterval(id)
    }
  }, [hasGroup])

  useEffect(() => {
    if (!cloudEnabled || !hasGroup || dirty.length === 0) {
      return
    }

    const id = setTimeout(() => syncNow(), 2500)

    return () => clearTimeout(id)
  }, [dirty, hasGroup])
}
