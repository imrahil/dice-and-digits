import { useI18n } from '../../i18n'
import { cx } from '../ui'

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
}

export function Die({ value, sides, rollKey, i }: { value: number; sides: number; rollKey: number; i: number }) {
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
