import { useEffect, useRef, useState } from 'react'
import { Crown, Minus, Plus } from 'lucide-react'
import { useI18n } from '../../i18n'
import { buzz } from '../../lib/haptics'
import { standings } from '../../lib/scoring'
import type { Scorer } from '../../lib/scorer'
import type { Seat, Session } from '../../types'
import { Keypad, KeypadDisplay, parseKeypad } from '../Keypad'
import { Avatar, Button, Sheet, cx } from '../ui'

/** Quick taps within this window are shown as one running "+7" bubble. */
const BURST_MS = 1600

export function CounterBoard({ session, scorer }: { session: Session; scorer: Scorer }) {
  const { t, num, time } = useI18n()
  const steps = session.rules.steps?.length ? session.rules.steps : [1, 5, 10]
  const table = standings(session)
  const byId = Object.fromEntries(table.map((r) => [r.seat.id, r]))
  const anyScore = session.log.length > 0

  const [burst, setBurst] = useState<Record<string, { sum: number; key: number }>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  const [pad, setPad] = useState<Seat | null>(null)
  const [value, setValue] = useState('')

  const add = (p: string, d: number) => {
    if (!d) {
      return
    }

    buzz(d > 0 ? 8 : [4, 30, 4])
    scorer.apply([{ kind: 'add', p, d }])
    setBurst((b) => ({ ...b, [p]: { sum: (b[p]?.sum ?? 0) + d, key: Date.now() } }))
    clearTimeout(timers.current[p])
    timers.current[p] = setTimeout(
      () =>
        setBurst((b) => {
          const next = { ...b }

          delete next[p]

          return next
        }),
      BURST_MS,
    )
  }

  const applyPad = (sign: 1 | -1) => {
    const n = parseKeypad(value)

    if (pad && n !== null) {
      add(pad.id, sign * n)
    }

    setPad(null)
  }

  return (
    <>
      <div className="space-y-3">
        {session.seats.map((seat) => {
          const row = byId[seat.id]
          const lead = anyScore && row.rank === 1 && session.seats.length > 1
          const b = burst[seat.id]
          const editable = scorer.canEdit(seat.id)

          return (
            <div
              key={seat.id}
              className={cx('surface relative rounded-3xl p-3 transition', lead && '!bg-gold/20 dark:!bg-gold/12')}
              style={{ backgroundImage: `linear-gradient(105deg, color-mix(in oklab, ${seat.color} 24%, transparent), transparent 60%)` }}
            >
              <div className="flex items-center gap-3">
                <Avatar name={seat.name} color={seat.color} />
                <span className="min-w-0 flex-1">
                  <span className="display flex items-center gap-1.5 truncate text-lg font-extrabold">
                    {seat.name}
                    {lead && <Crown className="size-5 shrink-0 rotate-12 text-gold drop-shadow-[1px_1px_0_var(--line)]" fill="currentColor" aria-label={t('leader')} />}
                  </span>
                </span>
                <span className="relative">
                  {b && (
                    <span
                      key={b.key}
                      className={cx(
                        'surface-flat absolute -top-1 right-full mr-2 -rotate-6 animate-pop rounded-full px-2 py-0.5 text-sm font-black text-white tabular-nums',
                        b.sum >= 0 ? '!bg-mint' : '!bg-danger',
                      )}
                    >
                      {b.sum > 0 ? '+' : ''}
                      {num(b.sum)}
                    </span>
                  )}
                  <button
                    disabled={!editable}
                    onClick={() => {
                      setValue('')
                      setPad(seat)
                    }}
                    aria-label={t('customAmount')}
                    className="display min-w-16 rounded-2xl px-2 text-right text-5xl font-black tabular-nums active:bg-ink/5 dark:active:bg-white/5"
                  >
                    {num(row.total)}
                  </button>
                </span>
              </div>
              {editable && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => add(seat.id, -steps[0])}
                    aria-label={`−${steps[0]}`}
                    className="surface-flat press flex h-12 w-14 shrink-0 items-center justify-center rounded-2xl text-ink/70 dark:text-white/70"
                  >
                    <Minus className="size-6" strokeWidth={3} />
                  </button>
                  {steps.slice(0, 4).map((st, i) => (
                    <button
                      key={st}
                      onClick={() => add(seat.id, st)}
                      className={cx(
                        'surface-flat press display flex h-12 flex-1 items-center justify-center gap-0.5 rounded-2xl text-lg font-black tabular-nums',
                        i === 0 && 'text-white [text-shadow:0_1px_0_rgb(0_0_0/0.25)]',
                      )}
                      style={i === 0 ? { background: seat.color } : undefined}
                    >
                      {i === 0 ? <Plus className="size-6" strokeWidth={3} /> : `+${st}`}
                      {i === 0 && st !== 1 && st}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {session.log.length > 0 && (
        <details className="surface mt-5 rounded-3xl p-4">
          <summary className="cursor-pointer font-extrabold">
            {t('history')} <span className="font-semibold text-ink/50 dark:text-white/50">({session.log.length})</span>
          </summary>
          <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
            {[...session.log].reverse().map((e, i) => {
              const seat = session.seats.find((s) => s.id === e.p)

              return (
                <li key={session.log.length - i} className="flex items-center gap-2 text-sm">
                  <span className="w-12 text-ink/45 tabular-nums dark:text-white/45">{time(e.t)}</span>
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: seat?.color }} />
                  <span className="flex-1 truncate font-semibold">{seat?.name}</span>
                  <span className={cx('font-black tabular-nums', e.d >= 0 ? 'text-mint' : 'text-danger')}>
                    {e.d > 0 ? '+' : ''}
                    {num(e.d)}
                  </span>
                </li>
              )
            })}
          </ul>
        </details>
      )}

      <Sheet
        open={!!pad}
        onClose={() => setPad(null)}
        title={
          pad && (
            <span className="flex items-center gap-2">
              <Avatar name={pad.name} color={pad.color} size="sm" />
              {pad.name}
            </span>
          )
        }
      >
        <KeypadDisplay value={value} />
        <Keypad value={value} onChange={setValue} allowNegative={false} />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button variant="danger" size="lg" onClick={() => applyPad(-1)} disabled={parseKeypad(value) === null}>
            <Minus className="size-5" strokeWidth={3} /> {t('keypadSubtract')}
          </Button>
          <Button variant="primary" size="lg" onClick={() => applyPad(1)} disabled={parseKeypad(value) === null}>
            <Plus className="size-5" strokeWidth={3} /> {t('keypadAdd')}
          </Button>
        </div>
      </Sheet>
    </>
  )
}
