import { Crown } from 'lucide-react'
import { useI18n } from '../../../i18n'
import { standings } from '../../../lib/scoring'
import { Avatar, cx } from '../../ui'
import { seatColor } from '../../../lib/pawns'
import type { Session } from '../../../types'

/**
 * Score grid shared by the rounds board and the result screen. `compact`
 * (the board) drops avatars and totals from the header, since the standing
 * cards above it already show them.
 */
export function RoundsTable({
  session,
  onRow,
  compact,
  highlightLast,
}: {
  session: Session
  onRow?: (i: number) => void
  compact?: boolean
  /** Tint the latest round so the table shows where the game is. */
  highlightLast?: boolean
}) {
  const { t, num } = useI18n()
  const table = standings(session)
  const byId = Object.fromEntries(table.map((r) => [r.seat.id, r]))
  const n = session.seats.length
  const fit = compact && n < 5
  const cols = `2.75rem repeat(${n}, ${fit ? 'minmax(0, 1fr)' : 'minmax(4.25rem, 1fr)'})`
  const scored = session.rounds.length > 0 && n > 1
  const winner = session.rules.mode === 'winner'
  const lastIndex = session.rounds.length - 1

  return (
    <div className={cx(!fit && '-mx-4 overflow-x-auto px-4 pb-2')}>
      <div className="surface min-w-fit overflow-hidden rounded-3xl">
        {compact ? (
          <div className="grid border-b border-edge py-2 dark:border-white/8" style={{ gridTemplateColumns: cols }}>
            <span />
            {session.seats.map((s) => (
              <span key={s.id} className="truncate px-1 text-center text-[13px] font-extrabold text-ink/60 dark:text-white/60">
                {s.name}
              </span>
            ))}
          </div>
        ) : (
          <div className="grid border-b border-edge dark:border-white/8" style={{ gridTemplateColumns: cols }}>
            <span />
            {session.seats.map((s) => {
              const lead = scored && byId[s.id].rank === 1

              return (
                <div key={s.id} className={cx('flex flex-col items-center gap-1 px-1 pt-3 pb-2', lead && 'bg-gold/12')}>
                  <span className="relative">
                    <Avatar name={s.name} color={seatColor(s)} size="sm" />
                    {lead && <Crown className="absolute -top-2.5 -right-2 size-4 rotate-12 text-gold" fill="currentColor" />}
                  </span>
                  <span className="w-full truncate text-center text-xs font-bold">{s.name}</span>
                  <span className="display text-2xl font-black tabular-nums">{num(byId[s.id].total)}</span>
                </div>
              )
            })}
          </div>
        )}
        {session.rounds.map((r, i) => {
          const latest = highlightLast && i === lastIndex

          return (
            <button
              key={i}
              disabled={!onRow}
              onClick={() => onRow?.(i)}
              className={cx(
                'grid w-full items-center border-b border-edge/70 last:border-0 active:bg-ink/5 dark:border-white/5 dark:active:bg-white/5',
                compact ? 'py-[3px]' : 'py-2',
                latest && 'bg-accent/15',
              )}
              style={{ gridTemplateColumns: cols }}
              aria-label={onRow ? t('editRound', { n: i + 1 }) : undefined}
              aria-current={latest ? 'true' : undefined}
            >
              <span className="text-center text-xs font-black text-ink/40 tabular-nums dark:text-white/40">{i + 1}</span>
              {session.seats.map((s) => {
                const v = r[s.id]

                return (
                  <span
                    key={s.id}
                    className={cx('text-center font-bold tabular-nums', compact ? 'text-[19px]' : 'text-lg', v != null && v < 0 && 'text-danger')}
                  >
                    {v == null ? '·' : winner ? (v ? (session.rules.lowWins ? '🔥' : '🏆') : '·') : num(v)}
                  </span>
                )
              })}
            </button>
          )
        })}
      </div>
    </div>
  )
}
