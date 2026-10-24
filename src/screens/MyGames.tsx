import { useState } from 'react'
import { Heart, Plus, Search, Shuffle, Sparkles } from 'lucide-react'
import { useI18n } from '../i18n'
import { allGames, matchesName, myGames, sortBuiltins } from '../lib/games'
import { buzz } from '../lib/haptics'
import { isFavorite, setFavorite, useStore } from '../lib/store'
import { navigate } from '../hooks/useRoute'
import { DrawSheet } from '../components/DrawGame'
import { FavoriteButton } from '../components/FavoriteButton'
import { ModeBadge } from '../components/ModeBadge'
import { Button, Empty, IconButton, Page, Section, Sheet, cx, inputClass } from '../components/ui'
import type { GameDef } from '../types'

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

      <AddGames open={adding} onClose={() => setAdding(false)} />
      <DrawSheet open={drawing} onClose={() => setDrawing(false)} games={mine} />
    </Page>
  )
}

/** Every game with a heart: tap to add it to My games or take it off. */
function AddGames({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, text, locale } = useI18n()
  const custom = useStore((s) => s.games)
  const favorites = useStore((s) => s.favorites)
  const [q, setQ] = useState('')

  const games = allGames(custom)
  const needle = q.trim().toLocaleLowerCase()
  const match = (g: GameDef) => matchesName(g, needle)
  const list = [
    ...games.filter((g) => !g.builtin && match(g)),
    ...sortBuiltins(games.filter((g) => g.builtin && match(g)), (g) => text(g.name), locale),
  ]

  return (
    <Sheet open={open} onClose={onClose} title={t('addGames')}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink/40 dark:text-white/40" />
        <input className={cx(inputClass, 'pl-11')} placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} type="search" />
      </div>
      <ul className="mt-3 space-y-2">
        {list.map((g) => {
          const on = isFavorite(favorites, g.id)

          return (
            <li key={g.id}>
              <button
                onClick={() => {
                  buzz()
                  setFavorite(g.id, !on)
                }}
                aria-pressed={on}
                className={cx('press flex w-full items-center gap-3 rounded-2xl p-2 pr-3 text-left', on ? 'surface' : 'surface-flat')}
              >
                <span className="flex size-10 shrink-0 items-center justify-center emoji-tile rounded-xl text-xl">{g.emoji}</span>
                <span className="min-w-0 flex-1 truncate font-bold">{text(g.name)}</span>
                <Heart className={cx('size-6 shrink-0', on ? 'text-danger' : 'text-ink/30 dark:text-white/30')} fill={on ? 'currentColor' : 'none'} />
              </button>
            </li>
          )
        })}
      </ul>
      {needle && !list.length && <p className="py-8 text-center text-ink/60 dark:text-white/60">{t('noGamesFound', { q })}</p>}
      <Button variant="primary" className="mt-4 w-full" onClick={onClose}>
        {t('done')}
      </Button>
    </Sheet>
  )
}
