import { Crown } from 'lucide-react'
import { useI18n } from '../../i18n'
import { standings } from '../../lib/scoring'
import { Avatar, Card, Section, cx } from '../ui'
import { seatColor } from '../../lib/pawns'
import type { Session } from '../../types'

export function Leaderboard({ session }: { session: Session }) {
  const { t, num } = useI18n()
  const table = standings(session)
  const anyScore = table.some((r) => r.total !== 0)

  return (
    <Section title={t('leaderboard')}>
      <Card className="!p-2">
        {table.map((r) => (
          <div key={r.seat.id} className={cx('flex items-center gap-3 rounded-2xl px-2 py-2.5', r.rank === 1 && anyScore && 'bg-gold/12')}>
            <span className="w-6 text-center font-black text-ink/50 tabular-nums dark:text-white/50">{r.rank}</span>
            <Avatar name={r.seat.name} color={seatColor(r.seat)} />
            <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-lg font-extrabold">
              {r.seat.name}
              {r.rank === 1 && anyScore && <Crown className="size-4 shrink-0 text-gold" fill="currentColor" />}
            </span>
            <span className="display text-3xl font-black tabular-nums">{num(r.total)}</span>
          </div>
        ))}
      </Card>
    </Section>
  )
}
