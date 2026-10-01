import { SheetBoard } from 'dice-and-digits-ui'
import { guestScorer, scorer, sevenWonders } from './fixtures'

/** 7 Wonders mid-scoring on the host phone: tap any cell to open the keypad. */
export function Host() {
  return (
    <div className="w-[420px]">
      <SheetBoard session={sevenWonders} scorer={scorer} />
    </div>
  )
}

/** On Kuba's own phone only his column is tappable. */
export function JoinedPhone() {
  return (
    <div className="w-[420px]">
      <SheetBoard session={sevenWonders} scorer={guestScorer} />
    </div>
  )
}
