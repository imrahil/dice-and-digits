import { ModeBadge } from 'dice-and-digits-ui'

/** The meta line under a game's name: scoring mode, target, low-wins. */
export function Modes() {
  return (
    <div className="flex flex-col gap-2">
      <ModeBadge mode="counter" />
      <ModeBadge mode="rounds" />
      <ModeBadge mode="sheet" />
      <ModeBadge mode="winner" />
    </div>
  )
}

export function WithTarget() {
  return <ModeBadge mode="counter" target={10} />
}

export function LowestWins() {
  return (
    <div className="flex flex-col gap-2">
      <ModeBadge mode="rounds" target={66} lowWins />
      <ModeBadge mode="winner" lowWins />
    </div>
  )
}

/** Under a game title, as in the game picker. */
export function InRow() {
  return (
    <div className="surface flex w-80 items-center gap-3 rounded-3xl p-3">
      <span className="emoji-tile flex size-11 shrink-0 items-center justify-center rounded-2xl text-2xl">🐮</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-extrabold">6 nimmt!</span>
        <ModeBadge mode="rounds" target={66} lowWins />
      </span>
    </div>
  )
}
