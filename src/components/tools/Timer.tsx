import { useEffect, useRef, useState } from 'react'
import { Pause, Play as PlayIcon, RotateCcw } from 'lucide-react'
import { useI18n } from '../../i18n'
import { buzz } from '../../lib/haptics'
import { beep, mmss } from '../../lib/sound'
import { Button, cx } from '../ui'

const PRESETS = [30, 60, 120, 300]

export function Timer() {
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
