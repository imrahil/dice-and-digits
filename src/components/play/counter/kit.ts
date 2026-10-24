import type { Scorer } from '../../../lib/scorer'
import type { Seat, Session, Standing } from '../../../types'

export type Burst = Record<string, { sum: number; key: number }>

/** What every view needs to draw a seat: its standing, the running bubble and the two ways to score. */
export type Kit = {
  session: Session
  scorer: Scorer
  steps: number[]
  byId: Record<string, Standing>
  burst: Burst
  /** Leader highlight: rank 1 once anyone has scored, and only with company. */
  lead: (seatId: string) => boolean
  add: (p: string, d: number) => void
  openPad: (seat: Seat) => void
}

export const COLS = ['grid-cols-1', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3']
