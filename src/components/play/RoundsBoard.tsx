import { useState } from 'react'
import { ArrowRight, Check, Crown, Trash2 } from 'lucide-react'
import { useI18n } from '../../i18n'
import { buzz } from '../../lib/haptics'
import { standings } from '../../lib/scoring'
import { updateSession } from '../../lib/store'
import type { Session } from '../../types'
import { Keypad, parseKeypad } from '../Keypad'
import { Avatar, Button, IconButton, Sheet, cx } from '../ui'

/** Score grid shared by the rounds board and the result screen. */
export function RoundsTable({ session, onRow }: { session: Session; onRow?: (i: number) => void }) {
  const { t, num } = useI18n()
  const table = standings(session)
  const byId = Object.fromEntries(table.map((r) => [r.seat.id, r]))
  const cols = `2.75rem repeat(${session.seats.length}, minmax(4.25rem, 1fr))`
  const scored = session.rounds.length > 0 && session.seats.length > 1

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
                <span className="text-2xl font-black tabular-nums">{num(byId[s.id].total)}</span>
              </div>
            )
          })}
        </div>
        {session.rounds.map((r, i) => (
          <button
            key={i}
            disabled={!onRow}
            onClick={() => onRow?.(i)}
            className="grid w-full items-center border-b border-edge/70 py-2 last:border-0 active:bg-ink/5 dark:border-white/5 dark:active:bg-white/5"
            style={{ gridTemplateColumns: cols }}
            aria-label={t('editRound', { n: i + 1 })}
          >
            <span className="text-center text-xs font-black text-ink/40 tabular-nums dark:text-white/40">{i + 1}</span>
            {session.seats.map((s) => {
              const v = r[s.id]
              return (
                <span key={s.id} className={cx('text-center text-lg font-bold tabular-nums', v != null && v < 0 && 'text-danger')}>
                  {v == null ? '·' : num(v)}
                </span>
              )
            })}
          </button>
        ))}
      </div>
    </div>
  )
}

export function RoundsBoard({ session, entry, setEntry }: { session: Session; entry: number | null; setEntry: (i: number | null) => void }) {
  const { t } = useI18n()
  return (
    <>
      <RoundsTable session={session} onRow={setEntry} />
      {session.rounds.length === 0 && <p className="px-4 py-6 text-center text-ink/55 dark:text-white/55">{t('noRoundsYet')}</p>}
      {entry !== null && <RoundEntry key={entry} session={session} index={entry} onClose={() => setEntry(null)} />}
    </>
  )
}

/** Bottom sheet: one keypad, one row per player, "Next" walks the table. */
function RoundEntry({ session, index, onClose }: { session: Session; index: number; onClose: () => void }) {
  const { t } = useI18n()
  const editing = index < session.rounds.length
  const [values, setValues] = useState<Record<string, string>>(() => {
    const r = session.rounds[index] ?? {}
    return Object.fromEntries(session.seats.map((s) => [s.id, r[s.id] != null ? String(r[s.id]) : '']))
  })
  const [focus, setFocus] = useState(0)
  const seat = session.seats[focus]
  const last = focus === session.seats.length - 1

  const save = () => {
    const round: Record<string, number> = {}
    for (const s of session.seats) round[s.id] = parseKeypad(values[s.id]) ?? 0
    buzz([8, 40, 8])
    updateSession(session.id, (s) => {
      const rounds = [...s.rounds]
      rounds[index] = round
      return { ...s, rounds }
    })
    onClose()
  }

  const remove = () => {
    updateSession(session.id, (s) => ({ ...s, rounds: s.rounds.filter((_, i) => i !== index) }))
    onClose()
  }

  const twoCol = session.seats.length > 4

  return (
    <Sheet
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {editing ? t('editRound', { n: index + 1 }) : t('roundN', { n: index + 1 })}
          {editing && (
            <IconButton label={t('deleteRound')} onClick={remove} className="ml-auto text-danger dark:text-[#ff8a93]">
              <Trash2 className="size-5" />
            </IconButton>
          )}
        </span>
      }
    >
      <div className={cx('mb-3 grid gap-1.5', twoCol && 'grid-cols-2')}>
        {session.seats.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setFocus(i)}
            className={cx(
              'flex h-12 items-center gap-2 rounded-2xl px-2 text-left transition',
              i === focus ? 'bg-card ring-2 ring-accent dark:bg-night' : 'bg-ink/4 dark:bg-white/5',
            )}
          >
            <Avatar name={s.name} color={s.color} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{s.name}</span>
            <span
              className={cx(
                'text-xl font-black tabular-nums',
                values[s.id] === '' && 'text-ink/25 dark:text-white/25',
                values[s.id].startsWith('-') && 'text-danger',
              )}
            >
              {values[s.id] || '0'}
            </span>
          </button>
        ))}
      </div>
      <Keypad value={values[seat.id]} onChange={(v) => setValues((x) => ({ ...x, [seat.id]: v }))} />
      <div className="mt-3 flex gap-3">
        {!last && (
          <Button size="lg" className="flex-1" onClick={save}>
            <Check className="size-5" /> {t('save')}
          </Button>
        )}
        <Button variant="primary" size="lg" className="flex-1" onClick={() => (last ? save() : setFocus(focus + 1))}>
          {last ? (
            <>
              <Check className="size-5" strokeWidth={3} /> {t('save')}
            </>
          ) : (
            <>
              {session.seats[focus + 1].name} <ArrowRight className="size-5" strokeWidth={3} />
            </>
          )}
        </Button>
      </div>
    </Sheet>
  )
}
