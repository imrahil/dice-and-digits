import { useI18n } from '../../i18n'
import { navigate } from '../../hooks/useRoute'
import { FavoriteButton } from '../FavoriteButton'
import { ModeBadge } from '../ModeBadge'
import { Button, Card } from '../ui'
import type { GameDef } from '../../types'

/** The game being set up, with its heart and a way back to the picker. */
export function ChosenGameCard({ game }: { game: GameDef }) {
  const { t, text } = useI18n()

  return (
    <Card className="flex items-center gap-3 !p-3">
      <span className="flex size-12 shrink-0 items-center justify-center emoji-tile rounded-2xl text-3xl">{game.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-extrabold">{text(game.name)}</span>
        <ModeBadge mode={game.mode} target={game.target} lowWins={game.lowWins} />
      </span>
      <FavoriteButton id={game.id} className="-mx-1" />
      <Button size="sm" variant="ghost" onClick={() => navigate('new', { replace: true })}>
        {t('changeGame')}
      </Button>
    </Card>
  )
}
