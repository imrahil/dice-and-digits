import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Crown, Minus, Plus } from 'lucide-react'
import { useI18n } from '../../i18n'
import { buzz } from '../../lib/haptics'
import { standings, targetProgress, toTarget } from '../../lib/scoring'
import { counterViewOf } from '../../lib/store'
import type { Scorer } from '../../lib/scorer'
import type { Seat, Session, Standing } from '../../types'
import { Keypad, KeypadDisplay, parseKeypad } from '../Keypad'
import { Avatar, Button, Sheet, cx } from '../ui'

/** Quick taps within this window are shown as one running "+7" bubble. */
const BURST_MS = 1600

type Burst = Record<string, { sum: number; key: number }>

/** What every view needs to draw a seat: its standing, the running bubble and the two ways to score. */
type Kit = {
  session: Session
  scorer: Scorer
  steps: number[]
  byId: Record<string, Standing>
  burst: Burst
  /** Leader highlight: rank 1 once anyone has scored, and only with company. */
  lead: (seatId: string) => boolean
  add: (p: string, d: number) => void
  openPad: (seat: Seat) => void
}

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

/** The running "+7" for a burst of taps. */
function BurstBubble({ burst, className }: { burst?: Burst[string]; className: string }) {
  const { num } = useI18n()

  if (!burst) {
    return null
  }

  return (
    <span
      key={burst.key}
      className={cx(
        'surface-flat absolute z-10 animate-pop rounded-full px-2 py-0.5 text-sm font-black text-white tabular-nums',
        burst.sum >= 0 ? '!bg-mint' : '!bg-danger',
        className,
      )}
    >
      {burst.sum > 0 ? '+' : ''}
      {num(burst.sum)}
    </span>
  )
}

function LeaderCrown() {
  const { t } = useI18n()

  return <Crown className="size-5 shrink-0 rotate-12 text-gold drop-shadow-[1px_1px_0_var(--line)]" fill="currentColor" aria-label={t('leader')} />
}

/**
 * − / main + / extra steps for one seat. The list keeps its roomy row (up to
 * four steps); tiles get taller buttons and room for two.
 */
export function SeatControls({
  seat,
  steps,
  onAdd,
  size,
}: {
  seat: Seat
  steps: number[]
  onAdd: (d: number) => void
  size: 'list' | 'tile'
}) {
  const list = size === 'list'

  return (
    <div className={list ? 'mt-3 flex gap-2' : 'mt-2.5 flex gap-1.5'}>
      <button
        onClick={() => onAdd(-steps[0])}
        aria-label={`−${steps[0]}`}
        className={cx(
          'surface-flat press flex shrink-0 items-center justify-center rounded-2xl text-ink/70 dark:text-white/70',
          list ? 'h-12 w-14' : 'h-13 w-11',
        )}
      >
        <Minus className="size-6" strokeWidth={3} />
      </button>
      {steps.slice(0, list ? 4 : 2).map((st, i) => (
        <button
          key={st}
          onClick={() => onAdd(st)}
          className={cx(
            'surface-flat press display flex items-center justify-center gap-0.5 rounded-2xl font-black tabular-nums',
            list ? 'h-12 flex-1 text-lg' : 'h-13',
            !list && (i === 0 ? 'min-w-0 flex-1 text-lg' : 'w-11 shrink-0 text-[17px]'),
            i === 0 && 'text-white [text-shadow:0_1px_0_rgb(0_0_0/0.25)]',
          )}
          style={i === 0 ? { background: seat.color } : undefined}
        >
          {i === 0 ? <Plus className={list ? 'size-6' : 'size-7'} strokeWidth={3} /> : `+${st}`}
          {i === 0 && st !== 1 && st}
        </button>
      ))}
    </div>
  )
}

function CounterList({ kit }: { kit: Kit }) {
  const { t, num } = useI18n()
  const { session, scorer, steps, byId, burst } = kit

  return (
    <div className="space-y-3">
      {session.seats.map((seat) => {
        const row = byId[seat.id]
        const lead = kit.lead(seat.id)
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
                  {lead && <LeaderCrown />}
                </span>
              </span>
              <span className="relative">
                <BurstBubble burst={burst[seat.id]} className="-top-1 right-full mr-2 -rotate-6" />
                <button
                  disabled={!editable}
                  onClick={() => kit.openPad(seat)}
                  aria-label={t('customAmount')}
                  className="display min-w-16 rounded-2xl px-2 text-right text-5xl font-black tabular-nums active:bg-ink/5 dark:active:bg-white/5"
                >
                  {num(row.total)}
                </button>
              </span>
            </div>
            {editable && <SeatControls seat={seat} steps={steps} onAdd={(d) => kit.add(seat.id, d)} size="list" />}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Score size for a tile: `max` px, shrunk to the tile's width (cqw of the score
 * area) so long numbers and narrow tiles never overflow.
 */
function scoreStyle(text: string, max: number): CSSProperties {
  return { fontSize: `min(${max}px, ${Math.round(125 / Math.max(text.length, 2))}cqw)` }
}

/** One player as a big tile, shared by the grid and the table. */
function SeatTile({
  kit,
  seat,
  scoreMax,
  narrow,
  showTarget,
}: {
  kit: Kit
  seat: Seat
  scoreMax: number
  /** Too narrow for a second step button. */
  narrow?: boolean
  /** Show what's left to the target and the progress under the score. */
  showTarget?: boolean
}) {
  const { t, num } = useI18n()
  const row = kit.byId[seat.id]
  const lead = kit.lead(seat.id)
  const editable = kit.scorer.canEdit(seat.id)
  const target = showTarget ? kit.session.rules.target : undefined
  const left = toTarget(row.total, target)
  const score = num(row.total)

  return (
    <div
      className={cx(
        'surface flex min-h-0 flex-col overflow-hidden rounded-3xl p-3 pb-2.5',
        lead && '!bg-[color-mix(in_oklab,var(--color-gold)_30%,var(--color-card))]',
      )}
      style={lead ? undefined : { background: `color-mix(in oklab, ${seat.color} 16%, var(--color-card))` }}
    >
      <div className="flex items-center gap-1.5">
        <Avatar name={seat.name} color={seat.color} size="sm" />
        <span className="display min-w-0 flex-1 truncate text-lg font-extrabold">{seat.name}</span>
        {lead && <LeaderCrown />}
      </div>

      <div className="@container flex min-h-0 flex-1 flex-col items-center justify-center py-1">
        <span className="relative">
          <button
            disabled={!editable}
            onClick={() => kit.openPad(seat)}
            aria-label={t('customAmount')}
            className="display rounded-2xl px-1 leading-[0.9] font-black tracking-tight tabular-nums active:bg-ink/5 dark:active:bg-white/5"
            style={scoreStyle(score, scoreMax)}
          >
            {score}
          </button>
          <BurstBubble burst={kit.burst[seat.id]} className="-top-3 -right-4 rotate-6" />
        </span>
        {left !== null && left > 0 && (
          <span className="mt-1.5 text-[13px] font-bold text-ink/60 dark:text-white/60">{t('toTarget', { n: num(left) })}</span>
        )}
      </div>

      {target != null && <TargetProgress total={row.total} target={target} color={seat.color} />}

      {editable && (
        <SeatControls seat={seat} steps={narrow ? kit.steps.slice(0, 1) : kit.steps} onAdd={(d) => kit.add(seat.id, d)} size="tile" />
      )}
    </div>
  )
}

/** One cell per point for short races (Catan's 10), a plain bar for long ones. */
function TargetProgress({ total, target, color }: { total: number; target: number; color: string }) {
  if (target > 0 && target <= 20) {
    const filled = Math.max(0, Math.min(target, total))

    return (
      <div className="mt-2 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${target}, minmax(0, 1fr))` }} aria-hidden>
        {Array.from({ length: target }, (_, i) => (
          <span key={i} className={cx('h-1.5 rounded-full', i < filled ? 'bg-ink dark:bg-white' : 'bg-ink/10 dark:bg-white/10')} />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10" aria-hidden>
      <div className="h-full rounded-full" style={{ width: `${(targetProgress(total, target) ?? 0) * 100}%`, background: color }} />
    </div>
  )
}

const COLS = ['grid-cols-1', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3']

/** The counter board as a grid of big tiles, whatever view the session has stored. */
export function CounterGrid({ session, scorer }: { session: Session; scorer: Scorer }) {
  return <CounterBoard session={{ ...session, counterView: 'grid' }} scorer={scorer} />
}

/**
 * The counter board in table mode (2–6 seats, full screen): the top half faces
 * the players opposite, `toolbar` sits between the halves.
 */
export function CounterTable({ session, scorer, toolbar }: { session: Session; scorer: Scorer; toolbar?: ReactNode }) {
  return <CounterBoard session={{ ...session, counterView: 'table' }} scorer={scorer} toolbar={toolbar} />
}

/** Tiles filling the screen between the header and the bottom bar. */
function GridView({ kit }: { kit: Kit }) {
  const n = kit.session.seats.length
  const cols = n === 1 ? 1 : n <= 6 ? 2 : 3
  const rows = Math.ceil(n / cols)

  return (
    <div
      className={cx(
        // header (3.5rem) + bottom bar spacer (6rem) + page padding (1rem) + a little air
        'grid min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-10.75rem)] auto-rows-fr gap-3 pt-1',
        COLS[cols],
      )}
    >
      {kit.session.seats.map((seat) => (
        <SeatTile key={seat.id} kit={kit} seat={seat} scoreMax={rows > 2 ? 64 : 96} narrow={cols > 2} showTarget />
      ))}
    </div>
  )
}

/**
 * Full screen for a phone lying between the players: the top half is turned
 * round to face the people opposite, the toolbar sits in the middle.
 */
function TableView({ kit, toolbar }: { kit: Kit; toolbar?: ReactNode }) {
  const seats = kit.session.seats
  const half = Math.floor(seats.length / 2)
  const top = seats.slice(0, half)
  const bottom = seats.slice(half)

  const tiles = (list: Seat[]) =>
    list.map((seat) => <SeatTile key={seat.id} kit={kit} seat={seat} scoreMax={104} narrow={list.length > 2} />)

  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col gap-2.5 px-3.5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className={cx('grid min-h-0 flex-1 rotate-180 gap-2.5', COLS[top.length])}>{tiles(top)}</div>
      {toolbar}
      <div className={cx('grid min-h-0 flex-1 gap-2.5', COLS[bottom.length])}>{tiles(bottom)}</div>
    </main>
  )
}
