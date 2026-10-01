import { Plus } from 'lucide-react'
import { useI18n } from '../i18n'
import { allGames } from '../lib/games'
import { useStore } from '../lib/store'
import { navigate } from '../hooks/useRoute'
import { ModeBadge } from '../components/ModeBadge'
import { Card, IconButton, Page, Section } from '../components/ui'
import type { GameDef } from '../types'

export function Games() {
  const { t, text } = useI18n()
  const custom = useStore((s) => s.games)
  const games = allGames(custom)
  const mine = games.filter((g) => !g.builtin)
  const builtin = games.filter((g) => g.builtin)

  const row = (g: GameDef) => (
    <Card key={g.id} onClick={() => navigate(`games/${encodeURIComponent(g.id)}`)} className="flex items-center gap-3 !p-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-paper text-2xl dark:bg-night">{g.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-extrabold">{text(g.name)}</span>
        <ModeBadge mode={g.mode} target={g.target} lowWins={g.lowWins} />
      </span>
    </Card>
  )

  return (
    <Page
      title={t('games')}
      back="more"
      actions={
        <IconButton label={t('newGameDef')} onClick={() => navigate('games/new')}>
          <Plus className="size-6" />
        </IconButton>
      }
    >
      {mine.length > 0 && (
        <Section title={t('yourGames')} className="!mt-0">
          <div className="space-y-2">{mine.map(row)}</div>
        </Section>
      )}
      <Section title={t('builtinGames')} className={mine.length ? '' : '!mt-0'}>
        <div className="space-y-2">{builtin.map(row)}</div>
      </Section>
    </Page>
  )
}
