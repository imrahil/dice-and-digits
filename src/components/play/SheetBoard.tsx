import { useState } from 'react'
import { ArrowDown, Check, Crown } from 'lucide-react'
import { useI18n } from '../../i18n'
import { buzz } from '../../lib/haptics'
import { bonusMissing, sheetBonus, standings } from '../../lib/scoring'
import { updateSession } from '../../lib/store'
import type { Session } from '../../types'
import { Keypad, KeypadDisplay, parseKeypad } from '../Keypad'
import { Avatar, Button, Sheet, cx } from '../ui'

type Cell = { cat: number; seat: number }

/** Category × player grid. Read-only without `onCell` (result screen). */
export function SheetTable({ session, onCell, active }: { session: Session; onCell?: (c: Cell) => void; active?: Cell | null }) {
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
      <div className="min-w-fit overflow-hidden rounded-3xl bg-card ring-1 ring-edge dark:bg-slate dark:ring-white/8">
        <div className="grid border-b border-edge dark:border-white/8" style={{ gridTemplateColumns: cols }}>
          <span />
          {session.seats.map((s) => {
            const lead = scored && byId[s.id].rank === 1
            return (
              <div key={s.id} className={cx('flex flex-col items-center gap-1 px-1 pt-3 pb-2', lead && 'bg-gold/12')}>
                <span className="relative">
                  <Avatar name={s.name} color={s.color} size="sm" />
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
              <span className="flex items-center py-2 pr-1 pl-3 text-[13px] leading-tight font-bold">
                {text(c.name)}
                {c.negative && <span className="ml-1 text-danger">−</span>}
              </span>
              {session.seats.map((s, si) => {
                const v = session.sheet[c.id]?.[s.id]
                const on = active?.cat === ci && active?.seat === si
                return (
                  <button
                    key={s.id}
                    disabled={!onCell}
                    onClick={() => onCell?.({ cat: ci, seat: si })}
                    className={cx(
                      'm-0.5 rounded-xl py-2 text-center text-lg font-bold tabular-nums transition',
                      onCell && 'active:scale-95',
                      on ? 'bg-accent/15 ring-2 ring-accent' : onCell && 'bg-ink/3 dark:bg-white/4',
                      c.negative && v ? 'text-danger' : '',
                    )}
                  >
                    {v == null ? <span className="text-ink/20 dark:text-white/20">–</span> : num(c.negative ? -Math.abs(v) : v)}
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
            <span key={s.id} className="py-2 text-center text-2xl font-black tabular-nums">
              {num(byId[s.id].total)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SheetBoard({ session }: { session: Session }) {
  const { t, text } = useI18n()
  const cats = session.rules.categories ?? []
  const [cell, setCell] = useState<Cell | null>(null)
  const [value, setValue] = useState('')

  const open = (c: Cell) => {
    const v = session.sheet[cats[c.cat].id]?.[session.seats[c.seat].id]
    setValue(v == null ? '' : String(v))
    setCell(c)
  }

  /** Store the value, then walk down the player's column (the way people fill a score pad). */
  const commit = (advance: boolean) => {
    if (!cell) return
    const cat = cats[cell.cat]
    const seat = session.seats[cell.seat]
    const n = parseKeypad(value)
    buzz(8)
    updateSession(session.id, (s) => {
      const row = { ...(s.sheet[cat.id] ?? {}) }
      if (n === null) delete row[seat.id]
      else row[seat.id] = n
      return { ...s, sheet: { ...s.sheet, [cat.id]: row } }
    })
    if (!advance) return setCell(null)
    const next =
      cell.cat < cats.length - 1
        ? { cat: cell.cat + 1, seat: cell.seat }
        : cell.seat < session.seats.length - 1
          ? { cat: 0, seat: cell.seat + 1 }
          : null
    if (next) {
      const v = session.sheet[cats[next.cat].id]?.[session.seats[next.seat].id]
      setValue(v == null ? '' : String(v))
      setCell(next)
    } else setCell(null)
  }

  const cat = cell ? cats[cell.cat] : null
  const seat = cell ? session.seats[cell.seat] : null
  const isLast = cell ? cell.cat === cats.length - 1 && cell.seat === session.seats.length - 1 : false

  return (
    <>
      <SheetTable session={session} onCell={open} active={cell} />
      <Sheet
        open={!!cell}
        onClose={() => setCell(null)}
        title={
          seat && (
            <span className="flex items-center gap-2">
              <Avatar name={seat.name} color={seat.color} size="sm" />
              <span className="truncate">{seat.name}</span>
            </span>
          )
        }
      >
        <KeypadDisplay value={value} prefix={cat ? text(cat.name) + (cat.negative ? ' (−)' : '') : ''} />
        <Keypad value={value} onChange={setValue} allowNegative={!cat?.negative} />
        <div className="mt-3 flex gap-3">
          {!isLast && (
            <Button size="lg" className="flex-1" onClick={() => commit(false)}>
              <Check className="size-5" /> {t('done')}
            </Button>
          )}
          <Button variant="primary" size="lg" className="flex-1" onClick={() => commit(!isLast)}>
            {isLast ? (
              <>
                <Check className="size-5" strokeWidth={3} /> {t('done')}
              </>
            ) : (
              <>
                <span className="truncate">
                  {cell && cell.cat === cats.length - 1 ? session.seats[cell.seat + 1].name : text(cats[(cell?.cat ?? 0) + 1].name)}
                </span>
                <ArrowDown className="size-5 shrink-0" strokeWidth={3} />
              </>
            )}
          </Button>
        </div>
      </Sheet>
    </>
  )
}
