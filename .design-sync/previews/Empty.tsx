import { Empty } from 'dice-and-digits-ui'

/** Empty states: a wiggling emoji, a title and one line of help. */
export function NoGames() {
  return (
    <div className="w-80">
      <Empty icon="🎲" title="No games yet">
        Pick a game and add players to start keeping score.
      </Empty>
    </div>
  )
}

export function NoStats() {
  return (
    <div className="w-80">
      <Empty icon="📊" title="Nothing to count yet">
        Finish a game and your stats will show up here.
      </Empty>
    </div>
  )
}

/** Icon only, e.g. a missing game. */
export function IconOnly() {
  return (
    <div className="w-80">
      <Empty icon="🤷" title="404" />
    </div>
  )
}
