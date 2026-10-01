import { useEffect } from 'react'

/** Keeps the screen on while `active` — nobody wants to unlock the phone between turns. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        const l = await navigator.wakeLock.request('screen')
        if (cancelled) l.release()
        else lock = l
      } catch {
        // Battery saver or an unfocused tab: nothing to do.
      }
    }
    // The lock is dropped whenever the page is hidden; take it again on return.
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [active])
}
