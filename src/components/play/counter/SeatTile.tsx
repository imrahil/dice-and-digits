import type { CSSProperties } from 'react'
import { useI18n } from '../../../i18n'
import { toTarget } from '../../../lib/scoring'
import { Avatar, cx } from '../../ui'
import { seatColor } from '../../../lib/pawns'
import { BurstBubble } from './BurstBubble'
import { LeaderCrown } from './LeaderCrown'
import { SeatControls } from './SeatControls'
import { TargetProgress } from './TargetProgress'
import type { Kit } from './kit'
import type { Seat } from '../../../types'

/**
 * Score size for a tile: `max` px, shrunk to the tile's width (cqw of the score
 * area) so long numbers and narrow tiles never overflow.
 */
function scoreStyle(text: string, max: number): CSSProperties {
  return { fontSize: `min(${max}px, ${Math.round(125 / Math.max(text.length, 2))}cqw)` }
}

/** One player as a big tile, shared by the grid and the table. */
export function SeatTile({
  kit,
  seat,
  scoreMax,
  narrow,
  showTarget,
}: {
  kit: Kit
  seat: Seat
  scoreMax: number
  /** Too narrow for a second step button. */
  narrow?: boolean
  /** Show what's left to the target and the progress under the score. */
  showTarget?: boolean
}) {
  const { t, num } = useI18n()
  const row = kit.byId[seat.id]
  const lead = kit.lead(seat.id)
  const editable = kit.scorer.canEdit(seat.id)
  const target = showTarget ? kit.session.rules.target : undefined
  const left = toTarget(row.total, target)
  const score = num(row.total)

  return (
    <div
      className={cx(
        'surface flex min-h-0 flex-col overflow-hidden rounded-3xl p-3 pb-2.5',
        lead && '!bg-[color-mix(in_oklab,var(--color-gold)_30%,var(--color-card))]',
      )}
      style={lead ? undefined : { background: `color-mix(in oklab, ${seatColor(seat)} 16%, var(--color-card))` }}
    >
      <div className="flex items-center gap-1.5">
        <Avatar name={seat.name} color={seatColor(seat)} size="sm" />
        <span className="display min-w-0 flex-1 truncate text-lg font-extrabold">{seat.name}</span>
        {lead && <LeaderCrown />}
      </div>

      <div className="@container flex min-h-0 flex-1 flex-col items-center justify-center py-1">
        <span className="relative">
          <button
            disabled={!editable}
            onClick={() => kit.openPad(seat)}
            aria-label={t('customAmount')}
            className="display rounded-2xl px-1 leading-[0.9] font-black tracking-tight tabular-nums active:bg-ink/5 dark:active:bg-white/5"
            style={scoreStyle(score, scoreMax)}
          >
            {score}
          </button>
          <BurstBubble burst={kit.burst[seat.id]} className="-top-3 -right-4 rotate-6" />
        </span>
        {left !== null && left > 0 && (
          <span className="mt-1.5 text-[13px] font-bold text-ink/60 dark:text-white/60">{t('toTarget', { n: num(left) })}</span>
        )}
      </div>

      {target != null && <TargetProgress total={row.total} target={target} color={seatColor(seat)} />}

      {editable && (
        <SeatControls seat={seat} steps={narrow ? kit.steps.slice(0, 1) : kit.steps} onAdd={(d) => kit.add(seat.id, d)} size="tile" />
      )}
    </div>
  )
}
