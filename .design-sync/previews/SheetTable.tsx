import { SheetTable } from 'dice-and-digits-ui'
import { guestScorer, sevenWonders } from './fixtures'

/** Category × player score pad; coins are entered as counted and shown as points. */
export function ScorePad() {
  return (
    <div className="w-[420px]">
      <SheetTable session={sevenWonders} onCell={() => {}} />
    </div>
  )
}

/** The cell being typed into is highlighted. */
export function ActiveCell() {
  return (
    <div className="w-[420px]">
      <SheetTable session={sevenWonders} onCell={() => {}} active={{ cat: 3, seat: 1 }} />
    </div>
  )
}

/** A joined phone may only fill its own column. */
export function JoinedPhone() {
  return (
    <div className="w-[420px]">
      <SheetTable session={sevenWonders} onCell={() => {}} canEdit={guestScorer.canEdit} />
    </div>
  )
}
