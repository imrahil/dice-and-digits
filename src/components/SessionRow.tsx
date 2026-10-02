import { Crown } from 'lucide-react'
import { useI18n } from '../i18n'
import { standings } from '../lib/scoring'
import type { Session } from '../types'
import { Avatar, Card } from './ui'
import { seatColor } from '../lib/pawns'

/** One game in a list: emoji, name, players, and either the winner or the leader. */
export function SessionRow({ session, onClick }: { session: Session; onClick: () => void }) {
  const { t, text, ago, time, num } = useI18n()
  const table = standings(session)
  const top = table.filter((r) => r.rank === 1)
  const done = Boolean(session.finishedAt)

  return (
    <Card onClick={onClick} className="flex items-center gap-3 !p-3">
      <span className="flex size-12 shrink-0 items-center justify-center emoji-tile rounded-2xl text-2xl">
        {session.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-extrabold">{text(session.rules.name)}</span>
        <span className="block truncate text-sm text-ink/60 dark:text-white/60">
          {done
            ? top.length === 1 || session.seats.length === 1
              ? t('wonBy', { name: top[0]?.seat.name ?? '' })
              : t('tieBetween', { names: top.map((r) => r.seat.name).join(', ') })
            : t('startedAgo', { time: ago(session.startedAt) })}
          {done && ` · ${time(session.finishedAt!)}`}
        </span>
        <span className="mt-1.5 flex -space-x-1.5">
          {session.seats.slice(0, 7).map((s) => (
            <span key={s.id} className="rounded-full ring-2 ring-card dark:ring-slate">
              <Avatar name={s.name} color={seatColor(s)} size="sm" />
            </span>
          ))}
        </span>
      </span>
      {top[0] && (
        <span className="flex shrink-0 flex-col items-end">
          <Crown className="size-4 text-gold" fill="currentColor" />
          <span className="display text-xl font-black tabular-nums">{num(top[0].total)}</span>
        </span>
      )}
    </Card>
  )
}
