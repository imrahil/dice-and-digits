import { useMemo, useState } from 'react'
import { Check, Plus, Search, Shuffle, Sparkles, X } from 'lucide-react'
import { PLAYER_COLORS } from '../data/presets'
import { useI18n } from '../i18n'
import { allGames, recentGameIds, sortBuiltins, startSession } from '../lib/games'
import { getState, savePlayer, uid, useStore } from '../lib/store'
import { buzz } from '../lib/haptics'
import { navigate } from '../hooks/useRoute'
import { toast } from '../components/dialogs'
import { ModeBadge } from '../components/ModeBadge'
import { Avatar, BottomBar, Button, Card, Page, Section, Toggle, cx, inputClass } from '../components/ui'
import type { GameDef, Player } from '../types'

export function NewGame({ gameId }: { gameId?: string }) {
  const custom = useStore((s) => s.games)
  const game = gameId ? allGames(custom).find((g) => g.id === gameId) : undefined
  return game ? <Setup key={game.id} game={game} /> : <GamePicker />
}

function GamePicker() {
  const { t, text, locale } = useI18n()
  const custom = useStore((s) => s.games)
  const sessions = useStore((s) => s.sessions)
  const [q, setQ] = useState('')

  const games = allGames(custom)
  const needle = q.trim().toLocaleLowerCase()
  const match = (g: GameDef) =>
    !needle ||
    (typeof g.name === 'string' ? [g.name] : [g.name.en, g.name.pl]).some((n) => n.toLocaleLowerCase().includes(needle))

  const recent = recentGameIds(sessions, 4)
    .map((id) => games.find((g) => g.id === id))
    .filter((g): g is GameDef => !!g && match(g))
  const mine = games.filter((g) => !g.builtin && match(g))
  const builtin = sortBuiltins(games.filter((g) => g.builtin && match(g)), (g) => text(g.name), locale)

  const row = (g: GameDef) => (
    <Card key={g.id} onClick={() => navigate(`new/${encodeURIComponent(g.id)}`, { replace: true })} className="flex items-center gap-3 !p-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-paper text-2xl dark:bg-night">{g.emoji}</span>
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

/** Seats from the last time this game (or failing that, anything) was played. */
function lastLineup(gameId: string, roster: Record<string, Player>): string[] {
  const sessions = Object.values(getState().sessions)
    .filter((s) => !s.deleted)
    .sort((a, b) => b.startedAt - a.startedAt)
  const last = sessions.find((s) => s.gameId === gameId) ?? sessions[0]
  return last ? last.seats.map((s) => s.id).filter((id) => roster[id] && !roster[id].deleted) : []
}

export function nextColor(players: Player[]): string {
  const used = new Set(players.filter((p) => !p.deleted).map((p) => p.color))
  return PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[players.length % PLAYER_COLORS.length]
}

function Setup({ game }: { game: GameDef }) {
  const { t, text } = useI18n()
  const roster = useStore((s) => s.players)
  const players = useMemo(
    () => Object.values(roster).filter((p) => !p.deleted).sort((a, b) => a.name.localeCompare(b.name)),
    [roster],
  )
  const [seats, setSeats] = useState<string[]>(() => lastLineup(game.id, getState().players))
  const [name, setName] = useState('')
  const [lowWins, setLowWins] = useState(game.lowWins)
  const [target, setTarget] = useState(game.target ? String(game.target) : '')

  const toggle = (id: string) => {
    buzz()
    setSeats((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const addNew = () => {
    const n = name.trim()
    if (!n) return
    const existing = players.find((p) => p.name.toLocaleLowerCase() === n.toLocaleLowerCase())
    if (existing) {
      if (!seats.includes(existing.id)) setSeats((s) => [...s, existing.id])
    } else {
      const p: Player = { id: uid(), name: n, color: nextColor(Object.values(roster)), updatedAt: Date.now() }
      savePlayer(p)
      setSeats((s) => [...s, p.id])
    }
    setName('')
  }

  const shuffle = () => {
    buzz(15)
    setSeats((s) => {
      const a = [...s]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    })
  }

  const pickFirst = () => {
    if (seats.length < 2) return
    buzz([10, 40, 10])
    const i = Math.floor(Math.random() * seats.length)
    setSeats((s) => [...s.slice(i), ...s.slice(0, i)])
    toast(t('firstPlayerIs', { name: roster[seats[i]]?.name ?? '' }))
  }

  const start = () => {
    const chosen = seats.map((id) => roster[id]).filter(Boolean)
    if (!chosen.length) return
    const tgt = parseInt(target, 10)
    const s = startSession(game, chosen, { lowWins, target: Number.isFinite(tgt) && tgt > 0 ? tgt : undefined })
    navigate(`play/${s.id}`, { replace: true })
  }

  const unselected = players.filter((p) => !seats.includes(p.id))

  return (
    <Page title={t('newGame')} back="" bare>
      <Card className="flex items-center gap-3 !p-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-paper text-3xl dark:bg-night">{game.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-extrabold">{text(game.name)}</span>
          <ModeBadge mode={game.mode} target={game.target} lowWins={game.lowWins} />
        </span>
        <Button size="sm" variant="ghost" onClick={() => navigate('new', { replace: true })}>
          {t('changeGame')}
        </Button>
      </Card>

      <Section
        title={t('choosePlayers')}
        action={
          seats.length > 1 && (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={shuffle}>
                <Shuffle className="size-4" /> {t('shuffleSeats')}
              </Button>
            </div>
          )
        }
      >
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            addNew()
          }}
        >
          <input
            className={inputClass}
            placeholder={t('newPlayerName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            enterKeyHint="done"
          />
          <Button type="submit" variant="secondary" className="!h-12 shrink-0" aria-label={t('addPlayer')} disabled={!name.trim()}>
            <Plus className="size-5" />
          </Button>
        </form>

        {seats.length > 0 && (
          <ol className="mt-3 space-y-2">
            {seats.map((id, i) => {
              const p = roster[id]
              if (!p) return null
              return (
                <li key={id} className="flex animate-pop items-center gap-3 rounded-2xl bg-card p-2 pr-1 ring-1 ring-edge dark:bg-slate dark:ring-white/8">
                  <span className="w-5 text-center text-sm font-black text-ink/40 tabular-nums dark:text-white/40">{i + 1}</span>
                  <Avatar name={p.name} color={p.color} />
                  <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                  <button
                    onClick={() => toggle(id)}
                    aria-label={`${t('delete')} ${p.name}`}
                    className="flex size-10 items-center justify-center rounded-full text-ink/50 active:bg-ink/5 dark:text-white/50"
                  >
                    <X className="size-5" />
                  </button>
                </li>
              )
            })}
          </ol>
        )}

        {seats.length > 1 && (
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={pickFirst}>
            🎯 {t('pickFirst')}
          </Button>
        )}

        {unselected.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {unselected.map((p) => (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="flex items-center gap-2 rounded-full bg-card py-1 pr-3.5 pl-1 font-bold ring-1 ring-edge transition active:scale-95 dark:bg-slate dark:ring-white/10"
              >
                <Avatar name={p.name} color={p.color} size="sm" />
                {p.name}
                <Plus className="size-4 text-ink/40 dark:text-white/40" />
              </button>
            ))}
          </div>
        ) : (
          players.length === 0 && <p className="mt-3 text-sm text-ink/55 dark:text-white/55">{t('rosterEmpty')}</p>
        )}
      </Section>

      <Section title={t('options')}>
        <Card className="!py-2">
          <Toggle checked={lowWins} onChange={setLowWins} label={t('lowestWins')} />
          <label className="flex items-center gap-3 border-t border-edge py-3 dark:border-white/8">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('targetScore')}</span>
              <span className="block text-sm text-ink/55 dark:text-white/55">{t('targetHint')}</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              className={cx(inputClass, '!w-28 text-right tabular-nums')}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="—"
            />
          </label>
        </Card>
      </Section>

      <BottomBar>
        <Button variant="primary" size="lg" className="flex-1" disabled={!seats.length} onClick={start}>
          <Check className="size-6" strokeWidth={3} />
          {seats.length ? t('startGame') : t('needPlayers')}
        </Button>
      </BottomBar>
    </Page>
  )
}
