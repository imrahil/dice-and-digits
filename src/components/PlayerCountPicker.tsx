import { useI18n } from '../i18n'
import { cx } from './ui'

/** The table sizes on offer; the last one means "this many or more". */
export const PLAYER_COUNTS = [2, 3, 4, 5, 6, 7]

/** How many are playing tonight: 2 to 7+, or any count. */
export function PlayerCountPicker({ value, onChange }: { value: number | null; onChange: (n: number | null) => void }) {
  const { t } = useI18n()
  const last = PLAYER_COUNTS[PLAYER_COUNTS.length - 1]
  const chip = (on: boolean) => cx('h-11 rounded-2xl font-bold tabular-nums transition active:scale-95', on ? 'chip-on' : 'surface-flat')

  return (
    <div role="radiogroup" aria-label={t('drawPlayers')}>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-bold text-ink/60 dark:text-white/60">{t('drawPlayers')}</span>
        <button role="radio" aria-checked={value === null} onClick={() => onChange(null)} className={cx(chip(value === null), '!h-9 px-3 text-sm')}>
          {t('drawAnyCount')}
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {PLAYER_COUNTS.map((n) => (
          <button key={n} role="radio" aria-checked={value === n} onClick={() => onChange(n)} className={chip(value === n)}>
            {n === last ? `${n}+` : n}
          </button>
        ))}
      </div>
    </div>
  )
}
