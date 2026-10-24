import { useState } from 'react'
import { Heart, Plus, Shuffle, Sparkles } from 'lucide-react'
import { useI18n } from '../i18n'
import { myGames } from '../lib/games'
import { useStore } from '../lib/store'
import { navigate } from '../hooks/useRoute'
import { AddGamesSheet } from '../components/AddGamesSheet'
import { DrawSheet } from '../components/DrawSheet'
import { FavoriteButton } from '../components/FavoriteButton'
import { ModeBadge } from '../components/ModeBadge'
import { Button, Empty, IconButton, Page, Section } from '../components/ui'

export function MyGames() {
  const { t, tp, text } = useI18n()
  const custom = useStore((s) => s.games)
  const favorites = useStore((s) => s.favorites)
  const [adding, setAdding] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const mine = myGames(favorites, custom)

  return (
    <Page
      title={t('myGames')}
      back="more"
      actions={
        <IconButton label={t('newGameDef')} onClick={() => navigate('games/new')}>
          <Plus className="size-6" />
        </IconButton>
      }
    >
      {mine.length === 0 ? (
        <>
          <Empty icon="❤️" title={t('myGamesEmptyTitle')}>
            {t('myGamesEmptyBody')}
          </Empty>
          <div className="space-y-3">
            <Button variant="primary" size="lg" className="w-full" onClick={() => setAdding(true)}>
              <Heart className="size-5" /> {t('addGames')}
            </Button>
            <Button className="w-full" onClick={() => navigate('games/new')}>
              <Sparkles className="size-5" /> {t('createGame')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Button variant="primary" size="lg" className="h-16 w-full !rounded-3xl !text-xl" disabled={mine.length < 2} onClick={() => setDrawing(true)}>
            <Shuffle className="size-6" strokeWidth={2.6} /> {t('drawGame')}
          </Button>
          {mine.length < 2 && <p className="mt-2 px-1 text-center text-sm text-ink/55 dark:text-white/55">{t('drawNeedTwo')}</p>}

          <Section title={tp('nGames', mine.length)}>
            <div className="space-y-2">
              {mine.map((g) => (
                <div key={g.id} className="surface flex items-center gap-1 rounded-3xl pr-1.5">
                  <button onClick={() => navigate(`new/${encodeURIComponent(g.id)}`)} className="press flex min-w-0 flex-1 items-center gap-3 rounded-3xl p-3 text-left">
                    <span className="flex size-11 shrink-0 items-center justify-center emoji-tile rounded-2xl text-2xl">{g.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-extrabold">{text(g.name)}</span>
                      <ModeBadge mode={g.mode} target={g.target} lowWins={g.lowWins} />
                    </span>
                  </button>
                  <FavoriteButton id={g.id} />
                </div>
              ))}
            </div>
          </Section>

          <Button className="mt-4 w-full" onClick={() => setAdding(true)}>
            <Heart className="size-5" /> {t('addGames')}
          </Button>
        </>
      )}

      <AddGamesSheet open={adding} onClose={() => setAdding(false)} />
      <DrawSheet open={drawing} onClose={() => setDrawing(false)} games={mine} />
    </Page>
  )
}
