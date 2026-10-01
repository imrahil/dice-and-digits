import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { useI18n } from '../i18n'
import { gameStats, headToHead, overview, playerStats } from '../lib/stats'
import { useStore } from '../lib/store'
import { Avatar, Card, Empty, Page, Section, cx } from '../components/ui'

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="!p-3">
      <span className="block text-2xl font-black tabular-nums">{value}</span>
      <span className="block text-xs font-bold text-ink/55 dark:text-white/55">{label}</span>
    </Card>
  )
}

export function Stats() {
  const { t, text, num, tp, duration, ago } = useI18n()
  const sessions = useStore((s) => s.sessions)
  const roster = useStore((s) => s.players)
  const list = Object.values(sessions)
  const ov = overview(list)
  const players = playerStats(list, roster)
  const games = gameStats(list)

  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const pa = players.find((p) => p.id === a) ?? players[0]
  const pb = players.find((p) => p.id === b && p.id !== pa?.id) ?? players.find((p) => p.id !== pa?.id)
  const h2h = pa && pb ? headToHead(list, pa.id, pb.id) : null

  if (ov.games === 0) {
    return (
      <Page title={t('navStats')}>
        <Empty icon="📊">{t('statsEmpty')}</Empty>
      </Page>
    )
  }

  const pct = (x: number) => `${Math.round(x * 100)}%`

  return (
    <Page title={t('navStats')}>
      <div className="grid grid-cols-3 gap-2">
        <Tile label={t('gamesPlayed')} value={num(ov.games)} />
        <Tile label={t('timePlayed')} value={duration(ov.minutes * 60000)} />
        <Tile label={t('playersCount')} value={num(ov.players)} />
      </div>

      <Section title={t('leaderboard')}>
        <Card className="!p-2">
          {players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
              <span className="w-5 text-center text-sm font-black text-ink/45 tabular-nums dark:text-white/45">{i + 1}</span>
              <Avatar name={p.name} color={p.color} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{p.name}</span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/8 dark:bg-white/10">
                    <span className="block h-full rounded-full" style={{ width: pct(p.winRate), backgroundColor: p.color }} />
                  </span>
                  <span className="w-9 text-right text-xs font-bold text-ink/60 tabular-nums dark:text-white/60">{pct(p.winRate)}</span>
                </span>
              </span>
              <span className="w-16 text-right">
                <span className="flex items-center justify-end gap-1 text-lg font-black tabular-nums">
                  {num(p.wins)} <Trophy className="size-4 text-gold" />
                </span>
                <span className="block text-xs font-semibold text-ink/50 dark:text-white/50">{tp('nGames', p.plays)}</span>
              </span>
            </div>
          ))}
        </Card>
      </Section>

      {pa && pb && h2h && (
        <Section title={t('headToHead')}>
          <Card>
            <div className="flex items-center gap-2">
              <PlayerSelect value={pa.id} onChange={setA} players={players} exclude={pb.id} />
              <span className="text-sm font-black text-ink/40 dark:text-white/40">vs</span>
              <PlayerSelect value={pb.id} onChange={setB} players={players} exclude={pa.id} />
            </div>
            {h2h.games === 0 ? (
              <p className="mt-3 text-center text-sm text-ink/55 dark:text-white/55">{tp('nGames', 0)}</p>
            ) : (
              <>
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-3xl font-black tabular-nums">{num(h2h.aAhead)}</span>
                  <span className="pb-1 text-xs font-bold text-ink/55 dark:text-white/55">
                    {tp('nGames', h2h.games)} · {t('draws')}: {num(h2h.draws)}
                  </span>
                  <span className="text-3xl font-black tabular-nums">{num(h2h.bAhead)}</span>
                </div>
                <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                  {h2h.aAhead > 0 && <span style={{ flex: h2h.aAhead, backgroundColor: pa.color }} className="rounded-l-full" />}
                  {h2h.draws > 0 && <span style={{ flex: h2h.draws }} className="bg-ink/15 dark:bg-white/20" />}
                  {h2h.bAhead > 0 && <span style={{ flex: h2h.bAhead, backgroundColor: pb.color }} className="rounded-r-full" />}
                </div>
              </>
            )}
          </Card>
        </Section>
      )}

      <Section title={t('byGame')}>
        <div className="space-y-2">
          {games.map((g) => (
            <Card key={g.gameId} className="!p-3">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-paper text-2xl dark:bg-night">{g.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{text(g.name)}</span>
                  <span className="block text-xs font-semibold text-ink/55 dark:text-white/55">
                    {tp('nGames', g.plays)} · {t('lastPlayed')} {ago(g.lastPlayed)}
                  </span>
                </span>
              </div>
              {g.record && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-gold/12 px-3 py-2">
                    <span className="block text-xs font-bold text-ink/55 dark:text-white/55">🏆 {t('record')}</span>
                    <span className="block truncate font-extrabold">
                      <span className="tabular-nums">{num(g.record.total)}</span> · {g.record.name}
                    </span>
                  </div>
                  {g.avgWinning != null && (
                    <div className="rounded-xl bg-ink/4 px-3 py-2 dark:bg-white/5">
                      <span className="block text-xs font-bold text-ink/55 dark:text-white/55">{t('avgWinning')}</span>
                      <span className="block font-extrabold tabular-nums">{num(g.avgWinning)}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </Section>
    </Page>
  )
}

function PlayerSelect({
  value,
  onChange,
  players,
  exclude,
}: {
  value: string
  onChange: (id: string) => void
  players: { id: string; name: string }[]
  exclude: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx('h-11 min-w-0 flex-1 rounded-xl bg-ink/5 px-3 font-bold outline-none dark:bg-white/8')}
    >
      {players
        .filter((p) => p.id !== exclude)
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
    </select>
  )
}
