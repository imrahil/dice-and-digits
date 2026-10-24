import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { PLAYER_COLORS } from '../../data/presets'
import { useI18n } from '../../i18n'
import { buzz } from '../../lib/haptics'
import { cx } from '../ui'

type Touch = { x: number; y: number; color: string }

const HOLD_MS = 2200

export function FingerPicker() {
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
