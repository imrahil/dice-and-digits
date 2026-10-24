import { Crown } from 'lucide-react'
import { useI18n } from '../../../i18n'
import { bonusMissing, cellPoints, isCount, sheetBonus, standings } from '../../../lib/scoring'
import { Avatar, cx } from '../../ui'
import { seatColor } from '../../../lib/pawns'
import { RateBadge, rate } from './RateBadge'
import type { Session } from '../../../types'

export type Cell = { cat: number; seat: number }

/** Category × player grid. Read-only without `onCell` (result screen); `canEdit` limits it to some columns. */
export function SheetTable({
  session,
  onCell,
  canEdit = () => true,
  active,
}: {
  session: Session
  onCell?: (c: Cell) => void
  canEdit?: (seatId: string) => boolean
  active?: Cell | null
}) {
  const { t, text, num } = useI18n()
  const cats = session.rules.categories ?? []
  const bonus = session.rules.bonus
  const table = standings(session)
  const byId = Object.fromEntries(table.map((r) => [r.seat.id, r]))
  const cols = `minmax(6.5rem, 1.4fr) repeat(${session.seats.length}, minmax(3.6rem, 1fr))`
  const scored = Object.values(session.sheet).some((r) => Object.keys(r).length) && session.seats.length > 1
  // The bonus row sits right after the last category it counts.
  const bonusAfter = bonus ? Math.max(...bonus.of.map((id) => cats.findIndex((c) => c.id === id))) : -1

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="surface min-w-fit overflow-hidden rounded-3xl">
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
              </div>
            )
          })}
        </div>

        {cats.map((c, ci) => (
          <div key={c.id}>
            <div className="grid border-b border-edge/70 dark:border-white/5" style={{ gridTemplateColumns: cols }}>
              <span className="flex flex-wrap items-center gap-x-1 py-2 pr-1 pl-3 text-[13px] leading-tight font-bold">
                {text(c.name)}
                {c.negative && <span className="text-danger">−</span>}
                {isCount(c) && <RateBadge c={c} />}
              </span>
              {session.seats.map((s, si) => {
                const v = session.sheet[c.id]?.[s.id]
                const on = active?.cat === ci && active?.seat === si
                const tap = onCell && canEdit(s.id)

                return (
                  <button
                    key={s.id}
                    disabled={!tap}
                    onClick={() => onCell?.({ cat: ci, seat: si })}
                    className={cx(
                      'm-0.5 rounded-xl py-2 text-center text-lg font-bold tabular-nums transition',
                      tap && 'active:scale-95',
                      on ? 'bg-accent/15 ring-2 ring-accent' : tap && 'bg-ink/3 dark:bg-white/4',
                      c.negative && v ? 'text-danger' : '',
                    )}
                  >
                    {v == null ? (
                      <span className="text-ink/20 dark:text-white/20">–</span>
                    ) : (
                      <>
                        {num(cellPoints(c, v))}
                        {isCount(c) && (
                          <span className="block text-[10px] leading-none font-bold text-ink/45 dark:text-white/45">
                            {num(v)}
                            {rate(c)}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
            {bonus && ci === bonusAfter && (
              <div className="grid border-b border-edge/70 bg-gold/8 dark:border-white/5" style={{ gridTemplateColumns: cols }}>
                <span className="flex items-center py-2 pr-1 pl-3 text-[13px] leading-tight font-bold">
                  {text(bonus.name)}
                  <span className="ml-1 text-ink/45 dark:text-white/45">
                    ≥{bonus.atLeast}
                  </span>
                </span>
                {session.seats.map((s) => {
                  const got = sheetBonus(session.rules, session.sheet, s.id)
                  const missing = bonusMissing(session.rules, session.sheet, s.id)

                  return (
                    <span
                      key={s.id}
                      className="flex flex-col items-center justify-center py-1 text-center tabular-nums"
                      title={got ? t('bonusEarned') : t('bonusNeeded', { n: missing })}
                    >
                      <span className={cx('text-lg font-black', got ? 'text-mint' : 'text-ink/25 dark:text-white/25')}>
                        {got ? `+${got}` : '0'}
                      </span>
                      {!got && <span className="text-[10px] font-bold text-ink/45 dark:text-white/45">−{missing}</span>}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        <div className="grid bg-ink/4 dark:bg-white/4" style={{ gridTemplateColumns: cols }}>
          <span className="flex items-center py-3 pl-3 text-sm font-black uppercase tracking-wide">{t('total')}</span>
          {session.seats.map((s) => (
            <span key={s.id} className="py-2 text-center display text-2xl font-black tabular-nums">
              {num(byId[s.id].total)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
