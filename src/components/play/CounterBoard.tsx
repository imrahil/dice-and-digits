import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useI18n } from '../../i18n'
import { buzz } from '../../lib/haptics'
import { standings } from '../../lib/scoring'
import { counterViewOf } from '../../lib/store'
import type { Scorer } from '../../lib/scorer'
import { Keypad, parseKeypad } from '../Keypad'
import { KeypadDisplay } from '../KeypadDisplay'
import { Avatar, Button, Sheet, cx } from '../ui'
import { seatColor } from '../../lib/pawns'
import { CounterList } from './counter/CounterList'
import { GridView } from './counter/GridView'
import { TableView } from './counter/TableView'
import type { Burst, Kit } from './counter/kit'
import type { Seat, Session } from '../../types'

/** Quick taps within this window are shown as one running "+7" bubble. */
const BURST_MS = 1600

export function CounterBoard({ session, scorer, toolbar }: { session: Session; scorer: Scorer; toolbar?: ReactNode }) {
  const { t, num, time } = useI18n()
  const steps = session.rules.steps?.length ? session.rules.steps : [1, 5, 10]
  const table = standings(session)
  const byId = Object.fromEntries(table.map((r) => [r.seat.id, r]))
  const anyScore = session.log.length > 0
  const view = counterViewOf(session)

  const [burst, setBurst] = useState<Burst>({})
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

  const kit: Kit = {
    session,
    scorer,
    steps,
    byId,
    burst,
    lead: (id) => anyScore && byId[id].rank === 1 && session.seats.length > 1,
    add,
    openPad: (seat) => {
      setValue('')
      setPad(seat)
    },
  }

  return (
    <>
      {view === 'list' && <CounterList kit={kit} />}
      {view === 'grid' && <GridView kit={kit} />}
      {view === 'table' && <TableView kit={kit} toolbar={toolbar} />}

      {session.log.length > 0 && (
        <details className={cx('surface mt-5 rounded-3xl p-4', view === 'table' && 'mx-3.5 mb-5')}>
          <summary className="cursor-pointer font-extrabold">
            {t('history')} <span className="font-semibold text-ink/50 dark:text-white/50">({session.log.length})</span>
          </summary>
          <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
            {[...session.log].reverse().map((e, i) => {
              const seat = session.seats.find((s) => s.id === e.p)

              return (
                <li key={session.log.length - i} className="flex items-center gap-2 text-sm">
                  <span className="w-12 text-ink/45 tabular-nums dark:text-white/45">{time(e.t)}</span>
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: seat && seatColor(seat) }} />
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
              <Avatar name={pad.name} color={seatColor(pad)} size="sm" />
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
