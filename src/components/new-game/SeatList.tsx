import { X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { needsOutline, pawnName } from '../../lib/pawns'
import { Avatar, cx } from '../ui'
import type { Player } from '../../types'

/** The seats in playing order: number, player, pawn colour (tap to change) and remove. */
export function SeatList({
  seats,
  roster,
  pawns,
  onPickPawn,
  onRemove,
}: {
  seats: string[]
  roster: Record<string, Player>
  pawns: Record<string, string>
  onPickPawn: (playerId: string) => void
  onRemove: (playerId: string) => void
}) {
  const { t, text } = useI18n()

  return (
    <ol className="mt-3 space-y-2">
      {seats.map((id, i) => {
        const p = roster[id]

        if (!p) {
          return null
        }

        return (
          <li key={id} className="flex animate-pop items-center gap-3 surface-flat rounded-2xl p-2 pr-1">
            <span className="display w-5 text-center text-base font-black text-ink/40 tabular-nums dark:text-white/40">{i + 1}</span>
            <Avatar name={p.name} color={p.color} />
            <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
            {pawns[id] && (
              <button
                onClick={() => onPickPawn(id)}
                aria-label={t('pawnFor', { name: p.name })}
                title={text(pawnName(pawns[id]) ?? '')}
                className="press flex size-11 shrink-0 items-center justify-center rounded-full"
              >
                <span
                  className={cx('size-8 rounded-full avatar-ring', needsOutline(pawns[id]) && 'ring-1 ring-ink/25 dark:ring-white/35')}
                  style={{ backgroundColor: pawns[id] }}
                />
              </button>
            )}
            <button
              onClick={() => onRemove(id)}
              aria-label={`${t('delete')} ${p.name}`}
              className="flex size-10 items-center justify-center rounded-full text-ink/50 active:bg-ink/5 dark:text-white/50"
            >
              <X className="size-5" />
            </button>
          </li>
        )
      })}
    </ol>
  )
}
