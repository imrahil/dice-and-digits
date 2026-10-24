import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useI18n } from '../../i18n'
import { buzz } from '../../lib/haptics'
import { IconButton } from '../ui'
import { Die } from './Die'

const SIDES = [2, 4, 6, 8, 10, 12, 20] as const

export function Dice() {
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
