import { useEffect, useRef, useState } from 'react'
import { buzz } from '../lib/haptics'
import { beep } from '../lib/sound'
import type { RoundTimer } from '../types'

export type PotatoPhase = 'idle' | 'running' | 'boom'

export type HotPotatoRound = {
  phase: PotatoPhase
  /** Time since Start, capped at the round's length. */
  elapsedMs: number
  /** This round's random length (0 before the first Start). */
  durationMs: number
  start: () => void
  /** Stop or skip the round: back to idle, nothing recorded. */
  reset: () => void
}

type Clock = { phase: PotatoPhase; startedAt: number; endsAt: number }

const IDLE: Clock = { phase: 'idle', startedAt: 0, endsAt: 0 }

/**
 * One Hot Potato round on the host phone: Start picks a random length in
 * [min, max] seconds, and the round goes off once the wall clock passes it.
 * Ephemeral on purpose: a reload or a backgrounded tab just re-checks the
 * clock, and nothing is saved until the loser is tapped.
 */
export function useHotPotatoRound(timer?: RoundTimer): HotPotatoRound {
  const [clock, setClock] = useState<Clock>(IDLE)
  const [now, setNow] = useState(0)
  const fired = useRef(false)

  useEffect(() => {
    if (clock.phase !== 'running') {
      return
    }

    const id = setInterval(() => {
      const t = Date.now()

      setNow(t)

      if (t >= clock.endsAt && !fired.current) {
        fired.current = true
        buzz([200, 100, 200, 100, 400])
        beep()
        setClock((c) => ({ ...c, phase: 'boom' }))
      }
    }, 200)

    return () => clearInterval(id)
  }, [clock])

  const start = () => {
    if (!timer) {
      return
    }

    const lo = Math.max(1, timer.min)
    const hi = Math.max(lo, timer.max)
    const seconds = lo + Math.floor(Math.random() * (hi - lo + 1))
    const t = Date.now()

    fired.current = false
    setNow(t)
    setClock({ phase: 'running', startedAt: t, endsAt: t + seconds * 1000 })
  }

  const durationMs = clock.endsAt - clock.startedAt
  const elapsedMs = clock.phase === 'idle' ? 0 : clock.phase === 'boom' ? durationMs : Math.min(Math.max(0, now - clock.startedAt), durationMs)

  return { phase: clock.phase, elapsedMs, durationMs, start, reset: () => setClock(IDLE) }
}
