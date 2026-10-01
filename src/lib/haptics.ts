import { getState } from './store'

/** A short buzz on Android; iOS Safari has no Vibration API and silently ignores it. */
export function buzz(pattern: number | number[] = 8) {
  if (!getState().settings.haptics) {
    return
  }

  navigator.vibrate?.(pattern)
}
