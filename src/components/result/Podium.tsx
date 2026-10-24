import { Crown } from 'lucide-react'
import { useI18n } from '../../i18n'
import { Avatar, cx } from '../ui'
import { seatColor } from '../../lib/pawns'
import type { Standing } from '../../types'

export const MEDAL = ['🥇', '🥈', '🥉']

export function Podium({ table }: { table: Standing[] }) {
  const { num } = useI18n()
  // Classic podium order: 2nd, 1st, 3rd.
  const top = table.slice(0, 3)
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top
  const height = (rank: number) => (rank === 1 ? 'h-28' : rank === 2 ? 'h-20' : 'h-14')

  return (
    <div className="flex items-end justify-center gap-2 pt-4">
      {order.map((r) => (
        <div key={r.seat.id} className="flex w-28 animate-rise flex-col items-center">
          {r.rank === 1 && <Crown className="mb-1 size-9 -rotate-6 text-gold drop-shadow-[2px_2px_0_var(--line)]" fill="currentColor" />}
          <Avatar name={r.seat.name} color={seatColor(r.seat)} size={r.rank === 1 ? 'lg' : 'md'} />
          <span className="display mt-1 w-full truncate text-center font-extrabold">{r.seat.name}</span>
          <span className="display text-2xl font-black tabular-nums">{num(r.total)}</span>
          <div
            className={cx(
              'surface mt-1 flex w-full items-start justify-center !rounded-b-none !border-b-0 pt-2 text-3xl',
              height(r.rank),
              r.rank === 1 ? '!bg-gold' : r.rank === 2 ? '!bg-candy-b' : '!bg-candy-a',
            )}
          >
            {MEDAL[r.rank - 1]}
          </div>
        </div>
      ))}
    </div>
  )
}
