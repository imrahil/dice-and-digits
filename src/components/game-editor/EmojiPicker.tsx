import { GAME_EMOJIS } from '../../data/presets'
import { cx } from '../ui'

/** The game's icon, picked from a grid of board-game emoji. */
export function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {GAME_EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => onChange(e)}
          className={cx('flex aspect-square items-center justify-center rounded-xl text-2xl transition', value === e ? 'bg-accent/15 ring-2 ring-accent' : 'surface-flat')}
        >
          {e}
        </button>
      ))}
    </div>
  )
}
