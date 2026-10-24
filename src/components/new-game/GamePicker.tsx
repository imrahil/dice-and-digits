import { useState } from 'react'
import { Search, Shuffle, Sparkles } from 'lucide-react'
import { useI18n } from '../../i18n'
import { allGames, matchesName, myGames, recentGameIds, sortBuiltins } from '../../lib/games'
import { useStore } from '../../lib/store'
import { navigate } from '../../hooks/useRoute'
import { DrawSheet } from '../DrawSheet'
import { ModeBadge } from '../ModeBadge'
import { Button, Card, Page, Section, cx, inputClass } from '../ui'
import type { GameDef } from '../../types'

export function GamePicker() {
  const { t, text, locale } = useI18n()
  const custom = useStore((s) => s.games)
  const sessions = useStore((s) => s.sessions)
  const favorites = useStore((s) => s.favorites)
  const [q, setQ] = useState('')
  const [drawing, setDrawing] = useState(false)

  const games = allGames(custom)
  const needle = q.trim().toLocaleLowerCase()
  const match = (g: GameDef) => matchesName(g, needle)
  const liked = myGames(favorites, custom)

  const recent = recentGameIds(sessions, 4)
    .map((id) => games.find((g) => g.id === id))
    .filter((g): g is GameDef => !!g && match(g))
  const mine = games.filter((g) => !g.builtin && match(g))
  const builtin = sortBuiltins(games.filter((g) => g.builtin && match(g)), (g) => text(g.name), locale)

  const row = (g: GameDef) => (
    <Card key={g.id} onClick={() => navigate(`new/${encodeURIComponent(g.id)}`, { replace: true })} className="flex items-center gap-3 !p-3">
      <span className="flex size-11 shrink-0 items-center justify-center emoji-tile rounded-2xl text-2xl">{g.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-extrabold">{text(g.name)}</span>
        <ModeBadge mode={g.mode} target={g.target} lowWins={g.lowWins} />
      </span>
    </Card>
  )

  return (
    <Page title={t('chooseGame')} back="">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink/40 dark:text-white/40" />
        <input
          className={cx(inputClass, 'pl-11')}
          placeholder={t('search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
        />
      </div>

      {liked.length > 0 && !needle && (
        <Section
          title={t('myGames')}
          action={
            liked.length > 1 && (
              <Button size="sm" variant="ghost" onClick={() => setDrawing(true)}>
                <Shuffle className="size-4" /> {t('draw')}
              </Button>
            )
          }
        >
          <div className="space-y-2">{liked.map(row)}</div>
        </Section>
      )}
      <DrawSheet open={drawing} onClose={() => setDrawing(false)} games={liked} />
      {recent.length > 0 && !needle && (
        <Section title={t('recentGames')}>
          <div className="space-y-2">{recent.map(row)}</div>
        </Section>
      )}
      {mine.length > 0 && (
        <Section title={t('yourGames')}>
          <div className="space-y-2">{mine.map(row)}</div>
        </Section>
      )}
      {builtin.length > 0 && (
        <Section title={t('builtinGames')}>
          <div className="space-y-2">{builtin.map(row)}</div>
        </Section>
      )}
      {needle && !mine.length && !builtin.length && (
        <p className="py-8 text-center text-ink/60 dark:text-white/60">{t('noGamesFound', { q })}</p>
      )}

      <Button variant="secondary" className="mt-6 w-full" onClick={() => navigate('games/new')}>
        <Sparkles className="size-5" /> {t('createGame')}
      </Button>
    </Page>
  )
}
