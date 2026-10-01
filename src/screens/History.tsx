import { useState } from 'react'
import { useI18n } from '../i18n'
import { finished } from '../lib/stats'
import { useStore } from '../lib/store'
import { navigate } from '../hooks/useRoute'
import { SessionRow } from '../components/SessionRow'
import { Empty, Page, cx } from '../components/ui'
import type { Session } from '../types'

function dayKey(ts: number) {
  const d = new Date(ts)

  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function History() {
  const { t, text, day, tp } = useI18n()
  const sessions = useStore((s) => s.sessions)
  const [filter, setFilter] = useState('')

  const all = finished(Object.values(sessions))
  const games = [...new Map(all.map((s) => [s.gameId, s])).values()]
  const list = filter ? all.filter((s) => s.gameId === filter) : all

  const groups: { key: string; ts: number; items: Session[] }[] = []

  for (const s of list) {
    const key = dayKey(s.finishedAt!)
    const g = groups[groups.length - 1]

    if (g?.key === key) {
      g.items.push(s)
    } else {
      groups.push({ key, ts: s.finishedAt!, items: [s] })
    }
  }

  const today = dayKey(Date.now())
  const yesterday = dayKey(Date.now() - 86400000)
  const label = (g: (typeof groups)[number]) =>
    g.key === today ? t('today') : g.key === yesterday ? t('yesterday') : day(g.ts)

  return (
    <Page title={t('navHistory')}>
      {all.length === 0 ? (
        <Empty icon="📜">{t('historyEmpty')}</Empty>
      ) : (
        <>
          <p className="px-1 text-sm font-semibold text-ink/55 dark:text-white/55">{tp('nGames', list.length)}</p>
          {games.length > 1 && (
            <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {[{ gameId: '', emoji: '🎲', name: t('allGames') }, ...games.map((s) => ({ gameId: s.gameId, emoji: s.emoji, name: text(s.rules.name) }))].map(
                (g) => (
                  <button
                    key={g.gameId}
                    onClick={() => setFilter(g.gameId)}
                    className={cx(
                      'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold whitespace-nowrap transition active:scale-95',
                      filter === g.gameId ? 'chip-on' : 'surface-flat',
                    )}
                  >
                    {g.emoji} {g.name}
                  </button>
                ),
              )}
            </div>
          )}
          {groups.map((g) => (
            <section key={g.key} className="mt-5">
              <h2 className="mb-2 px-1 text-xs font-extrabold tracking-wide text-ink/50 uppercase dark:text-white/50">{label(g)}</h2>
              <div className="space-y-2">
                {g.items.map((s) => (
                  <SessionRow key={s.id} session={s} onClick={() => navigate(`result/${s.id}`)} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </Page>
  )
}
