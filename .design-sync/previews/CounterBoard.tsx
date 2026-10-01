import { CounterBoard } from 'dice-and-digits-ui'
import { catan, guestScorer, scorer } from './fixtures'

/** The host's phone during Catan: every seat has tap buttons; the leader is gold. */
export function Host() {
  return (
    <div className="w-[420px]">
      <CounterBoard session={catan} scorer={scorer} />
    </div>
  )
}

/** A player who joined from their own phone can only score their own seat. */
export function JoinedPhone() {
  return (
    <div className="w-[420px]">
      <CounterBoard session={catan} scorer={guestScorer} />
    </div>
  )
}
