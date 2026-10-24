import type { RoomView } from '../../hooks/useRoom'
import { CounterBoard } from '../play/CounterBoard'
import { RoundsBoard } from '../play/RoundsBoard'
import { SheetBoard } from '../play/SheetBoard'
import { WinnerBoard } from '../play/WinnerBoard'
import type { Session } from '../../types'

/** Same boards as the host, limited by the room's scorer to this phone's seat. */
export function GuestBoard({
  session,
  room,
  entry,
  setEntry,
}: {
  session: Session
  room: RoomView
  entry: number | null
  setEntry: (i: number | null) => void
}) {
  switch (session.rules.mode) {
    case 'counter': {
      // Own card first: it's the only one with buttons.
      const seats = [...session.seats].sort((a, b) => Number(b.id === room.mySeat) - Number(a.id === room.mySeat))

      return <CounterBoard session={{ ...session, seats }} scorer={room.scorer} />
    }

    case 'rounds':
      return <RoundsBoard session={session} scorer={room.scorer} entry={entry} setEntry={setEntry} />
    case 'sheet':
      return <SheetBoard session={session} scorer={room.scorer} />
    case 'winner':
      return <WinnerBoard session={session} scorer={room.scorer} untimed />
  }
}
