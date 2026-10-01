import { RoundsTable } from 'dice-and-digits-ui'
import { kittens, thousand } from './fixtures'

/** Totals on top (leader in gold), one row per round; negative scores in red. */
export function Scores() {
  return (
    <div className="w-[420px]">
      <RoundsTable session={thousand} onRow={() => {}} />
    </div>
  )
}

/** Winner-only games show a trophy for each round won. */
export function Wins() {
  return (
    <div className="w-[420px]">
      <RoundsTable session={kittens} />
    </div>
  )
}
