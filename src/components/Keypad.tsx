import { Delete } from 'lucide-react'
import { buzz } from '../lib/haptics'
import { cx } from './ui'

/**
 * On-screen number pad. The system numeric keyboard on iOS has no minus key,
 * and negative scores are everyday stuff (Tysiąc, failed tickets), so we
 * bring our own.
 */
export function Keypad({ value, onChange, allowNegative = true }: { value: string; onChange: (v: string) => void; allowNegative?: boolean }) {
  const press = (k: string) => {
    buzz(6)

    if (k === 'back') {
      return onChange(value.slice(0, -1))
    }

    if (k === 'sign') {
      return onChange(value.startsWith('-') ? value.slice(1) : '-' + value)
    }

    const digits = value.replace('-', '')

    if (digits.length >= 6) {
      return
    }

    const next = (value.startsWith('-') ? '-' : '') + (digits === '0' ? k : digits + k)

    onChange(next)
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', allowNegative ? 'sign' : '', '0', 'back']

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k, i) =>
        k === '' ? (
          <span key={i} />
        ) : (
          <button
            key={k}
            onClick={() => press(k)}
            aria-label={k === 'back' ? 'Backspace' : k === 'sign' ? '±' : k}
            className={cx(
              'display flex h-14 items-center justify-center rounded-2xl text-2xl font-extrabold',
              k === 'back' || k === 'sign' ? 'surface press !bg-accent/15 text-accent' : 'surface press',
            )}
          >
            {k === 'back' ? <Delete className="size-6" /> : k === 'sign' ? '±' : k}
          </button>
        ),
      )}
    </div>
  )
}

export const parseKeypad = (v: string): number | null => {
  if (v === '' || v === '-') {
    return null
  }

  const n = parseInt(v, 10)

  return Number.isFinite(n) ? n : null
}

/** The big read-out above the pad. */
export function KeypadDisplay({ value, prefix, placeholder = '0' }: { value: string; prefix?: string; placeholder?: string }) {
  return (
    <div className="display mb-3 flex h-16 items-center justify-end rounded-2xl border-[length:var(--bw)] border-(--line) bg-ink px-4 text-4xl font-black text-candy-e tabular-nums shadow-[inset_0_2px_10px_rgb(0_0_0/0.5)] [text-shadow:0_0_14px_color-mix(in_oklab,var(--color-candy-e)_55%,transparent)] dark:bg-black/60">
      {prefix && <span className="mr-auto text-lg font-bold text-white/55 [text-shadow:none]">{prefix}</span>}
      {value ? value : <span className="text-white/25 [text-shadow:none]">{placeholder}</span>}
    </div>
  )
}
