import { WinnerBoard } from 'dice-and-digits-ui'
import { kittens, potato, scorer } from './fixtures'

/** Exploding Kittens: tap whoever won the round; the leader gets the crown. */
export function Wins() {
  return (
    <div className="w-[420px]">
      <WinnerBoard session={kittens} scorer={scorer} />
    </div>
  )
}

/** Hot Potato between rounds: the timer card, then a loss tile each; fewest burns wins. */
export function Losses() {
  return (
    <div className="w-[420px]">
      <WinnerBoard session={potato} scorer={scorer} />
    </div>
  )
}

/** A round is running: the tiles dim and can't be tapped. */
export function TimedRunning() {
  return (
    <div className="w-[420px]">
      <WinnerBoard session={potato} scorer={scorer} phase="running" />
    </div>
  )
}

/** It went off: every tile offers +1 for whoever was holding the potato. */
export function TimedBoom() {
  return (
    <div className="w-[420px]">
      <WinnerBoard session={potato} scorer={scorer} phase="boom" />
    </div>
  )
}
