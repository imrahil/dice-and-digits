import { Radio, Smartphone } from 'lucide-react'
import { useI18n } from '../../i18n'
import type { HostRoom } from '../../hooks/useLiveHost'
import { Avatar, Button } from '../ui'
import { seatColor } from '../../lib/pawns'
import type { Session } from '../../types'

/** Who scores from their own phone; the host can free a seat (e.g. a dead battery). */
export function JoinedSeats({ session, room, onStop }: { session: Session; room: HostRoom; onStop: () => void }) {
  const { t, tp } = useI18n()

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <h3 className="text-xs font-extrabold tracking-wide text-ink/50 uppercase dark:text-white/50">{t('playersOnPhones')}</h3>
        <span className="text-xs font-bold text-ink/50 dark:text-white/50">{tp('nPhones', room.guests)}</span>
      </div>
      <div className="space-y-1.5">
        {session.seats.map((s) => {
          const joined = room.seats[s.id]

          return (
            <div key={s.id} className="surface-flat flex items-center gap-3 rounded-2xl px-2 py-1.5">
              <Avatar name={s.name} color={seatColor(s)} size="sm" />
              <span className="min-w-0 flex-1 truncate font-bold">{s.name}</span>
              {joined ? (
                <>
                  <Smartphone className="size-4 text-mint" />
                  <Button size="sm" variant="ghost" onClick={() => room.release(s.id)}>
                    {t('freeSeat')}
                  </Button>
                </>
              ) : (
                <span className="pr-2 text-xs font-semibold text-ink/45 dark:text-white/45">{t('notJoined')}</span>
              )}
            </div>
          )
        })}
      </div>
      <Button variant="ghost" className="mt-3 w-full" onClick={onStop}>
        <Radio className="size-5" /> {t('liveStop')}
      </Button>
    </div>
  )
}
