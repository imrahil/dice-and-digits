import { Heart } from 'lucide-react'
import { useI18n } from '../i18n'
import { buzz } from '../lib/haptics'
import { isFavorite, setFavorite, useStore } from '../lib/store'
import { IconButton, cx } from './ui'

/** The heart that adds a game to (or removes it from) My games. */
export function FavoriteButton({ id, className }: { id: string; className?: string }) {
  const { t } = useI18n()
  const on = useStore((s) => isFavorite(s.favorites, id))

  return (
    <IconButton
      label={on ? t('removeFromMyGames') : t('addToMyGames')}
      aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation()
        buzz()
        setFavorite(id, !on)
      }}
      className={cx('size-11 shrink-0', on && '!text-danger', className)}
    >
      <Heart className={cx('size-6 transition', on && 'animate-pop')} fill={on ? 'currentColor' : 'none'} />
    </IconButton>
  )
}
