import type { Scorer } from '../../lib/scorer'
import { useHotPotatoRound, type HotPotatoRound, type PotatoPhase } from '../../hooks/useHotPotatoRound'
import { TapBoard } from './winner/TapBoard'
import { TimedBoard } from './winner/TimedBoard'
import type { Session } from '../../types'

/**
 * For games with no points (Exploding Kittens, Hot Potato): one tap records
 * who won the round, or who lost it when the game is set to lowest-wins.
 * Stored as an ordinary round with 1 for that player.
 */
export function WinnerBoard({
  session,
  scorer,
  round,
  phase,
  untimed,
}: {
  session: Session
  scorer: Scorer
  /** The round timer, when the screen around it drives it (Play's bottom bar). */
  round?: HotPotatoRound
  /** Show a fixed timer phase (previews and designs, no clock). */
  phase?: PotatoPhase
  /** Ignore `rules.timer`: a joined phone just records, the host runs the clock. */
  untimed?: boolean
}) {
  const own = useHotPotatoRound(session.rules.timer)
  const timer = untimed ? undefined : session.rules.timer

  if (timer) {
    const r = round ?? own

    return <TimedBoard session={session} scorer={scorer} timer={timer} round={phase ? { ...r, phase } : r} />
  }

  return <TapBoard session={session} scorer={scorer} />
}
