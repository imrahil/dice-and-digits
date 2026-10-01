import { SeatControls } from 'dice-and-digits-ui'
import { seats } from './fixtures'

const noop = () => {}

/** The counter list's row: − then + in the seat colour, then up to three more quick steps. */
export function ListRow() {
  return (
    <div className="w-[388px]">
      <SeatControls seat={seats[0]} steps={[1, 5, 10]} onAdd={noop} size="list" />
    </div>
  )
}

/** A grid or table tile: taller buttons, the main + and one extra step. */
export function Tile() {
  return (
    <div className="w-[180px]">
      <SeatControls seat={seats[1]} steps={[1, 2]} onAdd={noop} size="tile" />
    </div>
  )
}

/** When the first step isn't 1, the main button shows its value. */
export function BigFirstStep() {
  return (
    <div className="w-[388px]">
      <SeatControls seat={seats[2]} steps={[5, 10]} onAdd={noop} size="list" />
    </div>
  )
}
