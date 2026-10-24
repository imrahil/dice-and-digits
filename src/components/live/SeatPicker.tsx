import { Hand } from 'lucide-react'
import { useI18n } from '../../i18n'
import type { RoomView } from '../../hooks/useRoom'
import { Avatar, Card, cx } from '../ui'
import { seatColor } from '../../lib/pawns'
import type { Session } from '../../types'

export function SeatPicker({ session, room }: { session: Session; room: RoomView }) {
  const { t } = useI18n()
  const ready = room.status === 'open'

  return (
    <Card className="mb-2">
      <p className="flex items-center gap-2 text-lg font-extrabold">
        <Hand className="size-5 text-accent" /> {t('joinAsPlayer')}
      </p>
      <p className="mt-0.5 text-sm text-ink/60 dark:text-white/60">{t('joinAsPlayerHint')}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {session.seats.map((seat) => {
          const taken = room.seats[seat.id]

          return (
            <button
              key={seat.id}
              disabled={taken || !ready}
              onClick={() => room.claim(seat.id)}
              className={cx(
                'flex h-14 items-center gap-2 rounded-2xl px-2 text-left',
                taken ? 'surface-flat opacity-45' : 'surface press',
              )}
            >
              <Avatar name={seat.name} color={seatColor(seat)} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{seat.name}</span>
                {taken && <span className="block text-xs font-semibold">{t('seatTaken')}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
