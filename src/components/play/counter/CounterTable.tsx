import type { ReactNode } from 'react'
import type { Scorer } from '../../../lib/scorer'
import { CounterBoard } from '../CounterBoard'
import type { Session } from '../../../types'

/**
 * The counter board in table mode (2–6 seats, full screen): the top half faces
 * the players opposite, `toolbar` sits between the halves.
 */
export function CounterTable({ session, scorer, toolbar }: { session: Session; scorer: Scorer; toolbar?: ReactNode }) {
  return <CounterBoard session={{ ...session, counterView: 'table' }} scorer={scorer} toolbar={toolbar} />
}
