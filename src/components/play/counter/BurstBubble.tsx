import { useI18n } from '../../../i18n'
import { cx } from '../../ui'
import type { Burst } from './kit'

/** The running "+7" for a burst of taps. */
export function BurstBubble({ burst, className }: { burst?: Burst[string]; className: string }) {
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
