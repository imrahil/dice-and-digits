import { CounterGrid } from 'dice-and-digits-ui'
import { catanGrid, scorer } from './fixtures'

/** Catan for four as big tiles: score, what's left to 10, one cell per point, − / + / +2. */
export function FourSeats() {
  return (
    <div className="skin-bg relative h-[860px] w-[420px] overflow-hidden rounded-3xl px-4 pt-4 [transform:translateZ(0)]">
      <CounterGrid session={catanGrid} scorer={scorer} />
    </div>
  )
}

/** Two players share one row of tall tiles. */
export function TwoSeats() {
  return (
    <div className="skin-bg relative h-[860px] w-[420px] overflow-hidden rounded-3xl px-4 pt-4 [transform:translateZ(0)]">
      <CounterGrid session={{ ...catanGrid, seats: catanGrid.seats.slice(0, 2) }} scorer={scorer} />
    </div>
  )
}
