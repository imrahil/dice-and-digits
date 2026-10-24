import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useI18n } from '../i18n'
import { playerStats } from '../lib/stats'
import { uid, useStore } from '../lib/store'
import { Avatar, Card, Empty, IconButton, Page } from '../components/ui'
import { nextColor } from '../lib/players'
import { PlayerEditor } from '../components/players/PlayerEditor'
import type { Player } from '../types'

export function Players() {
  const { t, tp } = useI18n()
  const roster = useStore((s) => s.players)
  const sessions = useStore((s) => s.sessions)
  const [editing, setEditing] = useState<Player | null>(null)

  const players = Object.values(roster)
    .filter((p) => !p.deleted)
    .sort((a, b) => a.name.localeCompare(b.name))
  const stats = Object.fromEntries(playerStats(Object.values(sessions), roster).map((s) => [s.id, s]))

  return (
    <Page
      title={t('players')}
      back="more"
      actions={
        <IconButton
          label={t('addPlayer')}
          onClick={() => setEditing({ id: uid(), name: '', color: nextColor(Object.values(roster)), updatedAt: 0 })}
        >
          <Plus className="size-6" />
        </IconButton>
      }
    >
      {players.length === 0 ? (
        <Empty icon="🧑‍🤝‍🧑">{t('noPlayers')}</Empty>
      ) : (
        <div className="space-y-2">
          {players.map((p) => (
            <Card key={p.id} onClick={() => setEditing(p)} className="flex items-center gap-3 !p-3">
              <Avatar name={p.name} color={p.color} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">{p.name}</span>
                {stats[p.id] && (
                  <span className="block text-sm text-ink/55 dark:text-white/55">
                    {tp('nGames', stats[p.id].plays)} · {tp('nWins', stats[p.id].wins)}
                  </span>
                )}
              </span>
            </Card>
          ))}
        </div>
      )}
      {editing && <PlayerEditor player={editing} isNew={!roster[editing.id]} onClose={() => setEditing(null)} />}
    </Page>
  )
}
