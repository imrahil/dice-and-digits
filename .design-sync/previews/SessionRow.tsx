import { SessionRow } from 'dice-and-digits-ui'
import { catan, catanFinished, kittens, thousandTied } from './fixtures'

const open = () => {}

/** A game still being played: start time and the current leader's score. */
export function InProgress() {
  return (
    <div className="w-96">
      <SessionRow session={catan} onClick={open} />
    </div>
  )
}

/** A finished game in the history list: winner, finish time, winning score. */
export function Finished() {
  return (
    <div className="w-96">
      <SessionRow session={catanFinished} onClick={open} />
    </div>
  )
}

/** A shared win lists everyone tied at the top. */
export function Tie() {
  return (
    <div className="w-96">
      <SessionRow session={thousandTied} onClick={open} />
    </div>
  )
}

/** The history list: rows stack with an 8px gap. */
export function List() {
  return (
    <div className="flex w-96 flex-col gap-2">
      <SessionRow session={kittens} onClick={open} />
      <SessionRow session={catanFinished} onClick={open} />
      <SessionRow session={thousandTied} onClick={open} />
    </div>
  )
}
