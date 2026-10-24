import { useState } from 'react'
import { Heart, Search } from 'lucide-react'
import { useI18n } from '../i18n'
import { allGames, matchesName, sortBuiltins } from '../lib/games'
import { buzz } from '../lib/haptics'
import { isFavorite, setFavorite, useStore } from '../lib/store'
import { Button, Sheet, cx, inputClass } from './ui'
import type { GameDef } from '../types'

/** Every game with a heart: tap to put it on My shelf or take it off. */
export function AddGamesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
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
