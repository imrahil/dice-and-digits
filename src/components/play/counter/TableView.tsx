import type { ReactNode } from 'react'
import { cx } from '../../ui'
import { SeatTile } from './SeatTile'
import { COLS } from './kit'
import type { Kit } from './kit'
import type { Seat } from '../../../types'

/**
 * Full screen for a phone lying between the players: the top half is turned
 * round to face the people opposite, the toolbar sits in the middle.
 */
export function TableView({ kit, toolbar }: { kit: Kit; toolbar?: ReactNode }) {
  const seats = kit.session.seats
  const half = Math.floor(seats.length / 2)
  const top = seats.slice(0, half)
  const bottom = seats.slice(half)

  const tiles = (list: Seat[]) =>
    list.map((seat) => <SeatTile key={seat.id} kit={kit} seat={seat} scoreMax={104} narrow={list.length > 2} />)

  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col gap-2.5 px-3.5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className={cx('grid min-h-0 flex-1 rotate-180 gap-2.5', COLS[top.length])}>{tiles(top)}</div>
      {toolbar}
      <div className={cx('grid min-h-0 flex-1 gap-2.5', COLS[bottom.length])}>{tiles(bottom)}</div>
    </main>
  )
}
