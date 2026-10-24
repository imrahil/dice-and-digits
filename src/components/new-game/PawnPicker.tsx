import { Check } from 'lucide-react'
import { useI18n } from '../../i18n'
import { isLight, needsOutline, pawnName } from '../../lib/pawns'
import { Avatar, Sheet, cx } from '../ui'
import type { Player } from '../../types'

/** Pick a pawn colour for one player; a colour someone else holds shows their avatar and is swapped. */
export function PawnPicker({
  playerId,
  palette,
  pawns,
  roster,
  onPick,
  onClose,
}: {
  /** Whose pawn is being picked; the sheet is closed when null. */
  playerId: string | null
  palette: string[]
  pawns: Record<string, string>
  roster: Record<string, Player>
  onPick: (hex: string) => void
  onClose: () => void
}) {
  const { t, text } = useI18n()

  return (
    <Sheet open={!!playerId} onClose={onClose} title={playerId && t('pawnFor', { name: roster[playerId]?.name ?? '' })}>
      <div className="grid grid-cols-5 gap-3">
        {palette.map((hex) => {
          const holder = Object.keys(pawns).find((id) => pawns[id] === hex)
          const mine = holder === playerId
          const other = holder && !mine ? roster[holder] : undefined

          return (
            <button
              key={hex}
              onClick={() => onPick(hex)}
              aria-label={text(pawnName(hex) ?? hex)}
              aria-pressed={mine}
              className={cx(
                'flex aspect-square items-center justify-center rounded-full transition active:scale-90',
                mine ? 'ring-4 ring-ink/25 dark:ring-white/40' : needsOutline(hex) && 'ring-1 ring-ink/25 dark:ring-white/35',
              )}
              style={{ backgroundColor: hex }}
            >
              {mine ? (
                <Check className={cx('size-6', isLight(hex) ? 'text-ink' : 'text-white')} strokeWidth={3} />
              ) : (
                other && <Avatar name={other.name} color={other.color} size="sm" />
              )}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
