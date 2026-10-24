import { useI18n } from '../../../i18n'
import { gapsToLeader, marginOfVictory, standings, targetProgress, toTarget } from '../../../lib/scoring'
import { Avatar, cx } from '../../ui'
import { needsOutline, seatColor } from '../../../lib/pawns'
import type { Session } from '../../../types'

/** One card per player, best first: gap to the leader and progress to the target. */
export function StandingCards({ session }: { session: Session }) {
  const { t, num } = useI18n()
  const table = standings(session)
  const gaps = gapsToLeader(table)
  const margin = marginOfVictory(table)
  const target = session.rules.target
  const scored = session.rounds.length > 0

  return (
    <div className="flex flex-col gap-2.5">
      {table.map((r, i) => {
        const lead = scored && r.rank === 1 && table.length > 1
        const left = toTarget(r.total, target)
        const progress = targetProgress(r.total, target)

        return (
          <div
            key={r.seat.id}
            className={cx(
              'surface flex flex-col gap-1.5 rounded-3xl px-3.5 pt-2 pb-2.5',
              lead && '!bg-[color-mix(in_oklab,var(--color-gold)_30%,var(--color-card))]',
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="display w-5 text-xl font-black text-ink/40 dark:text-white/40">{r.rank}</span>
              <Avatar name={r.seat.name} color={seatColor(r.seat)} size="sm" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="display block truncate text-[19px] font-extrabold">{r.seat.name}</span>
                {scored && r.rank === 1 && (margin > 0 || left !== null) && (
                  <span className="block text-[13px] font-bold text-mint">
                    {[margin > 0 && t('leadsBy', { n: num(margin) }), left !== null && t('toTarget', { n: num(left) })].filter(Boolean).join(' · ')}
                  </span>
                )}
                {scored && r.rank !== 1 && (
                  <span className="block truncate text-[13px] font-bold text-ink/60 dark:text-white/60">{t('behindLeader', { n: num(gaps[i]) })}</span>
                )}
              </span>
              <span className="display text-5xl leading-[0.9] font-black tabular-nums">{num(r.total)}</span>
            </div>
            {progress !== null && (
              <div className="h-2 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10" aria-hidden>
                <div
                  className={cx(
                    'h-full rounded-full',
                    session.rules.lowWins && 'opacity-60',
                    needsOutline(seatColor(r.seat)) && 'ring-1 ring-ink/25 ring-inset dark:ring-white/35',
                  )}
                  style={{ width: `${progress * 100}%`, background: seatColor(r.seat) }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
