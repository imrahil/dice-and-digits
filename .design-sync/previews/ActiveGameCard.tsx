import { ActiveGameCard } from 'dice-and-digits-ui'
import { catanGrid, sevenWonders, thousandLive } from './fixtures'

/** The home screen's game in progress: everyone's score, the leader in gold, and the way back in. */
export function Counter() {
  return (
    <div className="w-[420px]">
      <ActiveGameCard session={catanGrid} live={false} />
    </div>
  )
}

/** Shared live: the LIVE pill sits in the head. */
export function Live() {
  return (
    <div className="w-[420px]">
      <ActiveGameCard session={thousandLive} live />
    </div>
  )
}

/** A score sheet shows — for players with no cell filled yet. */
export function ScoreSheet() {
  return (
    <div className="w-[420px]">
      <ActiveGameCard session={sevenWonders} live={false} />
    </div>
  )
}
