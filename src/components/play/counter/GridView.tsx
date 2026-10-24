import { cx } from '../../ui'
import { SeatTile } from './SeatTile'
import { COLS } from './kit'
import type { Kit } from './kit'

/** Tiles filling the screen between the header and the bottom bar. */
export function GridView({ kit }: { kit: Kit }) {
  const n = kit.session.seats.length
  const cols = n === 1 ? 1 : n <= 6 ? 2 : 3
  const rows = Math.ceil(n / cols)

  return (
    <div
      className={cx(
        // header (3.5rem) + bottom bar spacer (6rem) + page padding (1rem) + a little air
        'grid min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-10.75rem)] auto-rows-fr gap-3 pt-1',
        COLS[cols],
      )}
    >
      {kit.session.seats.map((seat) => (
        <SeatTile key={seat.id} kit={kit} seat={seat} scoreMax={rows > 2 ? 64 : 96} narrow={cols > 2} showTarget />
      ))}
    </div>
  )
}
