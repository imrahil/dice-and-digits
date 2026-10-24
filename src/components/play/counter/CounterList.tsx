import { useI18n } from '../../../i18n'
import { Avatar, cx } from '../../ui'
import { seatColor } from '../../../lib/pawns'
import { BurstBubble } from './BurstBubble'
import { LeaderCrown } from './LeaderCrown'
import { SeatControls } from './SeatControls'
import type { Kit } from './kit'

export function CounterList({ kit }: { kit: Kit }) {
  const { t, num } = useI18n()
  const { session, scorer, steps, byId, burst } = kit

  return (
    <div className="space-y-3">
      {session.seats.map((seat) => {
        const row = byId[seat.id]
        const lead = kit.lead(seat.id)
        const editable = scorer.canEdit(seat.id)

        return (
          <div
            key={seat.id}
            className={cx('surface relative rounded-3xl p-3 transition', lead && '!bg-gold/20 dark:!bg-gold/12')}
            style={{ backgroundImage: `linear-gradient(105deg, color-mix(in oklab, ${seatColor(seat)} 24%, transparent), transparent 60%)` }}
          >
            <div className="flex items-center gap-3">
              <Avatar name={seat.name} color={seatColor(seat)} />
              <span className="min-w-0 flex-1">
                <span className="display flex items-center gap-1.5 truncate text-lg font-extrabold">
                  {seat.name}
                  {lead && <LeaderCrown />}
                </span>
              </span>
              <span className="relative">
                <BurstBubble burst={burst[seat.id]} className="-top-1 right-full mr-2 -rotate-6" />
                <button
                  disabled={!editable}
                  onClick={() => kit.openPad(seat)}
                  aria-label={t('customAmount')}
                  className="display min-w-16 rounded-2xl px-2 text-right text-5xl font-black tabular-nums active:bg-ink/5 dark:active:bg-white/5"
                >
                  {num(row.total)}
                </button>
              </span>
            </div>
            {editable && <SeatControls seat={seat} steps={steps} onAdd={(d) => kit.add(seat.id, d)} size="list" />}
          </div>
        )
      })}
    </div>
  )
}
