import { WinnerBoard } from 'dice-and-digits-ui'
import { kittens, scorer } from './fixtures'

/** Exploding Kittens: tap whoever won the round; the leader gets the crown. */
export function Wins() {
  return (
    <div className="w-[420px]">
      <WinnerBoard session={kittens} scorer={scorer} />
    </div>
  )
}

/** Hot Potato (lowWins): it records who got burnt, and fewest burns wins. */
export function Losses() {
  return (
    <div className="w-[420px]">
      <WinnerBoard
        session={{ ...kittens, id: 's-potato', emoji: '🥔', rules: { name: { en: 'Hot Potato', pl: 'Gorący ziemniak' }, mode: 'winner', lowWins: true } }}
        scorer={scorer}
      />
    </div>
  )
}
