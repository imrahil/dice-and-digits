import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Minus, Pause, Play as PlayIcon, Plus, RotateCcw } from 'lucide-react'
import { PLAYER_COLORS } from '../data/presets'
import { useI18n } from '../i18n'
import { buzz } from '../lib/haptics'
import { navigate } from '../hooks/useRoute'
import { Button, IconButton, Page, Segmented, cx } from '../components/ui'

type Tab = 'dice' | 'picker' | 'timer'

export function Tools({ tab }: { tab?: string }) {
  const { t } = useI18n()
  const active: Tab = tab === 'picker' || tab === 'timer' ? tab : 'dice'

  return (
    <Page title={t('navTools')}>
      <Segmented
        value={active}
        onChange={(v) => navigate(`tools/${v}`, { replace: true })}
        options={[
          { value: 'dice', label: `🎲 ${t('dice')}` },
          { value: 'picker', label: `👆 ${t('picker')}` },
          { value: 'timer', label: `⏳ ${t('timer')}` },
        ]}
      />
      <div className="mt-4">
        {active === 'dice' && <Dice />}
        {active === 'picker' && <FingerPicker />}
        {active === 'timer' && <Timer />}
      </div>
    </Page>
  )
}

// ---- dice ------------------------------------------------------------------

const SIDES = [2, 4, 6, 8, 10, 12, 20] as const
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
}

function Die({ value, sides, rollKey, i }: { value: number; sides: number; rollKey: number; i: number }) {
  const { t } = useI18n()
  const coin = sides === 2

  return (
    <div
      key={rollKey}
      className={cx(
        'flex size-24 animate-roll items-center justify-center shadow-[inset_0_-5px_0_rgba(0,0,0,0.2)]',
        coin ? 'rounded-full bg-gold text-ink' : 'rounded-[26px] bg-accent text-white',
      )}
      style={{ animationDelay: `${i * 40}ms` }}
    >
      {sides === 6 ? (
        <svg viewBox="0 0 100 100" className="size-20" aria-label={String(value)}>
          {PIPS[value].map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r="9" fill="currentColor" />
          ))}
        </svg>
      ) : coin ? (
        <span className="text-center text-sm leading-tight font-black uppercase">{value === 1 ? t('heads') : t('tails')}</span>
      ) : (
        <span className="display text-4xl font-black tabular-nums">{value}</span>
      )}
    </div>
  )
}

function Dice() {
  const { t, num } = useI18n()
  const [count, setCount] = useState(2)
  const [sides, setSides] = useState<number>(6)
  const [values, setValues] = useState<number[]>([6, 6])
  const [rollKey, setRollKey] = useState(0)
  const [log, setLog] = useState<number[][]>([])

  const roll = (n = count, s = sides) => {
    buzz([10, 30, 10, 30, 20])
    const next = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * s))

    setValues(next)
    setRollKey((k) => k + 1)
    setLog((l) => [next, ...l].slice(0, 6))
  }

  const sum = values.reduce((a, b) => a + b, 0)

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="surface flex items-center rounded-2xl">
          <IconButton label="−" onClick={() => count > 1 && (setCount(count - 1), roll(count - 1))}>
            <Minus className="size-5" />
          </IconButton>
          <span className="w-12 text-center text-lg font-black tabular-nums">{count}×</span>
          <IconButton label="+" onClick={() => count < 8 && (setCount(count + 1), roll(count + 1))}>
            <Plus className="size-5" />
          </IconButton>
        </div>
        <select
          value={sides}
          onChange={(e) => {
            const s = Number(e.target.value)

            setSides(s)
            roll(count, s)
          }}
          className="surface h-11 flex-1 rounded-2xl px-3 font-bold outline-none"
          aria-label={t('diceSides')}
        >
          {SIDES.map((s) => (
            <option key={s} value={s}>
              {s === 2 ? `🪙 ${t('coin')}` : `d${s}`}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => roll()}
        className="mt-4 flex min-h-72 w-full flex-col items-center justify-center rounded-[32px] bg-[radial-gradient(circle_at_50%_40%,#2f6b4f,#1d4a36)] p-6 shadow-[inset_0_2px_12px_rgba(0,0,0,0.35)] active:brightness-110"
        aria-label={t('roll')}
      >
        <div className="flex flex-wrap items-center justify-center gap-4">
          {values.map((v, i) => (
            <Die key={`${rollKey}-${i}`} value={v} sides={sides} rollKey={rollKey} i={i} />
          ))}
        </div>
        <span className="mt-5 text-sm font-bold text-white/70">{t('tapToRoll')}</span>
      </button>

      {sides !== 2 && count > 1 && (
        <p className="mt-4 text-center text-lg font-bold">
          {t('sum')}: <span className="display text-3xl font-black tabular-nums">{num(sum)}</span>
        </p>
      )}
      {log.length > 1 && (
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {log.slice(1).map((r, i) => (
            <li key={i} className="rounded-full bg-ink/5 px-3 py-1 text-sm font-bold text-ink/60 tabular-nums dark:bg-white/8 dark:text-white/60">
              {sides === 2 ? r.map((v) => (v === 1 ? t('heads')[0] : t('tails')[0])).join(' ') : r.join(' + ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---- finger picker ---------------------------------------------------------

type Touch = { x: number; y: number; color: string }
const HOLD_MS = 2200

function FingerPicker() {
  const { t } = useI18n()
  const area = useRef<HTMLDivElement>(null)
  const [touches, setTouches] = useState<Record<number, Touch>>({})
  const [chosen, setChosen] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const ids = Object.keys(touches).map(Number)

  // Every time the set of fingers changes, restart the countdown.
  const idKey = ids.join(',')

  useEffect(() => {
    clearTimeout(timer.current)

    if (chosen !== null || ids.length < 2) {
      return
    }

    timer.current = setTimeout(() => {
      const pick = ids[Math.floor(Math.random() * ids.length)]

      setChosen(pick)
      buzz([40, 60, 120])
    }, HOLD_MS)

    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey, chosen])

  const pos = (e: RPointerEvent) => {
    const r = area.current!.getBoundingClientRect()

    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const down = (e: RPointerEvent) => {
    e.preventDefault()

    if (chosen !== null) {
      return
    }

    buzz(6)
    setTouches((tt) => {
      const used = new Set(Object.values(tt).map((x) => x.color))
      const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0]

      return { ...tt, [e.pointerId]: { ...pos(e), color } }
    })
  }

  const move = (e: RPointerEvent) => {
    const p = pos(e)

    setTouches((tt) => (tt[e.pointerId] ? { ...tt, [e.pointerId]: { ...tt[e.pointerId], ...p } } : tt))
  }

  const up = (e: RPointerEvent) => {
    setTouches((tt) => {
      const next = { ...tt }

      delete next[e.pointerId]

      if (Object.keys(next).length === 0) {
        setChosen(null)
      }

      return next
    })
  }

  const hint = chosen !== null ? t('pickerReset') : t('pickerHint')

  return (
    <div
      ref={area}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
      className="relative h-[calc(100dvh-15rem)] min-h-80 touch-none overflow-hidden rounded-[32px] bg-ink select-none dark:bg-black"
    >
      <p className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-lg font-bold text-white/60">
        {ids.length === 0 || chosen !== null ? hint : ids.length === 1 ? '👆 +1' : '…'}
      </p>
      {ids.map((id) => {
        const p = touches[id]
        const win = chosen === id
        const lose = chosen !== null && !win

        return (
          <span
            key={id}
            className={cx(
              'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300',
              win ? 'size-40 ring-[12px] ring-white/40' : 'size-24',
              lose && 'scale-50 opacity-15',
              chosen === null && ids.length > 1 && 'animate-pulse',
            )}
            style={{ left: p.x, top: p.y, backgroundColor: p.color }}
          />
        )
      })}
      {chosen !== null && (
        <p className="pointer-events-none absolute inset-x-0 top-6 text-center text-2xl font-black text-white">{t('pickerChosen')}</p>
      )}
    </div>
  )
}

// ---- timer -----------------------------------------------------------------

const PRESETS = [30, 60, 120, 300]

function beep() {
  try {
    const ctx = new AudioContext()
    const o = ctx.createOscillator()
    const g = ctx.createGain()

    o.connect(g)
    g.connect(ctx.destination)
    o.frequency.value = 880
    g.gain.setValueAtTime(0.25, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    o.start()
    o.stop(ctx.currentTime + 0.8)
    o.onended = () => ctx.close()
  } catch {
    // No audio: the vibration and the red ring still say it.
  }
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

function Timer() {
  const { t } = useI18n()
  const [length, setLength] = useState(60)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [left, setLeft] = useState(60)
  const [, tick] = useState(0)
  const firedRef = useRef(false)

  useEffect(() => {
    if (endsAt === null) {
      return
    }

    const id = setInterval(() => {
      const remain = Math.ceil((endsAt - Date.now()) / 1000)

      setLeft(remain)
      tick((x) => x + 1)

      if (remain <= 0 && !firedRef.current) {
        firedRef.current = true
        buzz([200, 100, 200, 100, 400])
        beep()
        setEndsAt(null)
        setLeft(0)
      }
    }, 200)

    return () => clearInterval(id)
  }, [endsAt])

  const running = endsAt !== null

  const start = () => {
    firedRef.current = false
    const from = left > 0 ? left : length

    setLeft(from)
    setEndsAt(Date.now() + from * 1000)
  }

  const pause = () => setEndsAt(null)

  const reset = (len = length) => {
    setEndsAt(null)
    setLength(len)
    setLeft(len)
  }

  const adjust = (d: number) => {
    const len = Math.max(10, length + d)

    setLength(len)

    if (!running) {
      setLeft(len)
    }
  }

  /** Tap the clock: next player's turn starts with a full timer. */
  const restart = () => {
    buzz(10)
    firedRef.current = false
    setLeft(length)
    setEndsAt(Date.now() + length * 1000)
  }

  const frac = Math.max(0, Math.min(1, left / length))
  const R = 120
  const C = 2 * Math.PI * R
  const done = left <= 0

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => reset(p)}
            className={cx(
              'flex-1 rounded-2xl py-2 font-bold tabular-nums transition active:scale-95',
              length === p ? 'chip-on' : 'surface-flat',
            )}
          >
            {mmss(p)}
          </button>
        ))}
      </div>

      <button onClick={restart} className="relative mt-6 size-72 active:scale-[0.98]" aria-label={t('start')}>
        <svg viewBox="0 0 280 280" className="size-full -rotate-90">
          <circle cx="140" cy="140" r={R} fill="none" strokeWidth="16" className="stroke-ink/8 dark:stroke-white/10" />
          <circle
            cx="140"
            cy="140"
            r={R}
            fill="none"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            className={cx('transition-[stroke-dashoffset] duration-200', frac < 0.2 ? 'stroke-danger' : 'stroke-mint')}
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cx('text-6xl font-black tabular-nums', done && 'text-danger')}>{mmss(left)}</span>
          {done && <span className="mt-1 text-lg font-extrabold text-danger">{t('timeUp')}</span>}
        </span>
      </button>

      <div className="mt-6 flex w-full gap-3">
        <Button size="lg" onClick={() => reset()} className="shrink-0" aria-label={t('reset')}>
          <RotateCcw className="size-5" />
        </Button>
        <Button size="lg" onClick={() => adjust(-10)} aria-label="−10 s">
          −10
        </Button>
        <Button size="lg" onClick={() => adjust(10)} aria-label="+10 s">
          +10
        </Button>
        <Button variant="primary" size="lg" className="flex-1" onClick={running ? pause : start}>
          {running ? <Pause className="size-5" /> : <PlayIcon className="size-5" />}
          {running ? t('pause') : t('start')}
        </Button>
      </div>
    </div>
  )
}
