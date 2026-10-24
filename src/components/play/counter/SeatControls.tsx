import { Minus, Plus } from 'lucide-react'
import { cx } from '../../ui'
import { seatColor } from '../../../lib/pawns'
import type { Seat } from '../../../types'

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
          style={i === 0 ? { background: seatColor(seat) } : undefined}
        >
          {i === 0 ? <Plus className={list ? 'size-6' : 'size-7'} strokeWidth={3} /> : `+${st}`}
          {i === 0 && st !== 1 && st}
        </button>
      ))}
    </div>
  )
}
