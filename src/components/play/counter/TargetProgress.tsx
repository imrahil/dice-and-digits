import { targetProgress } from '../../../lib/scoring'
import { cx } from '../../ui'
import { needsOutline } from '../../../lib/pawns'

/** One cell per point for short races (Catan's 10), a plain bar for long ones. */
export function TargetProgress({ total, target, color }: { total: number; target: number; color: string }) {
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
      <div
        className={cx('h-full rounded-full', needsOutline(color) && 'ring-1 ring-ink/25 ring-inset dark:ring-white/35')}
        style={{ width: `${(targetProgress(total, target) ?? 0) * 100}%`, background: color }}
      />
    </div>
  )
}
