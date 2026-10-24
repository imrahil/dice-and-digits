import { Copy, Play as PlayIcon } from 'lucide-react'
import { useI18n } from '../../i18n'
import { saveGame, setFavorite, uid } from '../../lib/store'
import { navigate } from '../../hooks/useRoute'
import { FavoriteButton } from '../FavoriteButton'
import { ModeBadge } from '../ModeBadge'
import { Button, Card, Page, cx } from '../ui'
import type { GameDef } from '../../types'

export function BuiltinView({ game }: { game: GameDef }) {
  const { t, text } = useI18n()

  const duplicate = () => {
    const copy: GameDef = {
      ...game,
      id: uid(),
      builtin: undefined,
      name: `${text(game.name)} (2)`,
      // Resolve bilingual labels into the current language: the copy is the user's now.
      categories: game.categories?.map((c) => ({ ...c, name: text(c.name) })),
      bonus: game.bonus && { ...game.bonus, name: text(game.bonus.name) },
      updatedAt: 0,
    }

    saveGame(copy)
    setFavorite(copy.id, true)
    navigate(`games/${copy.id}`, { replace: true })
  }

  return (
    <Page title={`${game.emoji} ${text(game.name)}`} back="games" actions={<FavoriteButton id={game.id} />}>
      <Card>
        <span className="text-xs font-extrabold tracking-wide text-ink/45 uppercase dark:text-white/45">{t('builtin')}</span>
        <ModeBadge mode={game.mode} target={game.target} lowWins={game.lowWins} />
        {game.categories && (
          <ul className="mt-3 space-y-1">
            {game.categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2 font-semibold">
                <span className={cx('size-1.5 rounded-full', c.negative ? 'bg-danger' : 'bg-accent')} />
                {text(c.name)}
                {c.negative && <span className="text-danger">(−)</span>}
                {c.per && c.per !== 1 && <span className="text-accent">×{c.per}</span>}
                {c.div && <span className="text-accent">÷{c.div}</span>}
              </li>
            ))}
            {game.bonus && (
              <li className="flex items-center gap-2 font-semibold text-mint">
                <span className="size-1.5 rounded-full bg-mint" />
                {text(game.bonus.name)}: +{game.bonus.points} (≥ {game.bonus.atLeast})
              </li>
            )}
          </ul>
        )}
        {game.zeroSum && <p className="mt-3 text-sm font-semibold text-ink/60 dark:text-white/60">🏆 {t('zeroSumHint')}</p>}
        {game.mode === 'winner' && <p className="mt-3 text-sm font-semibold text-ink/60 dark:text-white/60">{t('modeWinnerHint')}</p>}
        {game.timer && (
          <p className="mt-3 text-sm font-semibold text-ink/60 dark:text-white/60">
            ⏱️ {t('timerSummary', { min: game.timer.min, max: game.timer.max })}
            {game.timer.hidden && ` · ${t('timerHidden')}`}
          </p>
        )}
        {game.steps && (
          <p className="mt-3 text-sm font-semibold text-ink/60 dark:text-white/60">
            {t('quickButtons')}: {game.steps.map((s) => `+${s}`).join(' ')}
          </p>
        )}
      </Card>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button onClick={duplicate}>
          <Copy className="size-5" /> {t('duplicate')}
        </Button>
        <Button variant="primary" onClick={() => navigate(`new/${encodeURIComponent(game.id)}`)}>
          <PlayIcon className="size-5" /> {t('newGame')}
        </Button>
      </div>
    </Page>
  )
}
