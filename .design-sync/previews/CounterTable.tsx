import { CounterTable, Icons } from 'dice-and-digits-ui'
import { catanTable, scorer } from './fixtures'

/** The middle toolbar, as the Play screen passes it in. */
function Dock() {
  return (
    <div className="nav-dock flex h-14 shrink-0 items-center gap-1 rounded-[20px] pr-1.5 pl-3.5 text-(--nav-ink)">
      <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold">🏝️ Catan · 42 min</span>
      <span className="flex size-11 items-center justify-center">
        <Icons.Undo2 className="size-5" />
      </span>
      <span className="flex size-11 items-center justify-center">
        <Icons.List className="size-5" />
      </span>
      <span className="nav-on flex h-11 items-center gap-1.5 rounded-2xl px-3.5 text-sm font-extrabold">
        <Icons.Flag className="size-4" strokeWidth={2.5} /> End
      </span>
    </div>
  )
}

/** A phone lying between four players: the top half is turned to face the two opposite. */
export function FourSeats() {
  return (
    <div className="skin-bg relative h-[860px] w-[420px] overflow-hidden rounded-3xl [transform:translateZ(0)] [&_main]:!h-full">
      <CounterTable session={catanTable} scorer={scorer} toolbar={<Dock />} />
    </div>
  )
}

/** Head to head: one tile each side. */
export function TwoSeats() {
  return (
    <div className="skin-bg relative h-[860px] w-[420px] overflow-hidden rounded-3xl [transform:translateZ(0)] [&_main]:!h-full">
      <CounterTable session={{ ...catanTable, seats: catanTable.seats.slice(0, 2) }} scorer={scorer} toolbar={<Dock />} />
    </div>
  )
}
