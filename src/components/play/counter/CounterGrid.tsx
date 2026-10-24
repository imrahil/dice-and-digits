import type { Scorer } from '../../../lib/scorer'
import { CounterBoard } from '../CounterBoard'
import type { Session } from '../../../types'

/** The counter board as a grid of big tiles, whatever view the session has stored. */
export function CounterGrid({ session, scorer }: { session: Session; scorer: Scorer }) {
  return <CounterBoard session={{ ...session, counterView: 'grid' }} scorer={scorer} />
}
