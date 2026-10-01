import { BUILTIN_GAMES } from '../data/presets'
import type { GameDef, Player, Session } from '../types'
import { getState, saveSession, uid, useStore, type State } from './store'

const GENERIC = ['builtin:counter', 'builtin:rounds']

/** Built-ins for a list: the generic counter and rounds first, the rest A–Z in the current language. */
export function sortBuiltins(games: GameDef[], label: (g: GameDef) => string, locale: string): GameDef[] {
  return [...games].sort((a, b) => {
    const ga = GENERIC.indexOf(a.id)
    const gb = GENERIC.indexOf(b.id)
    if (ga !== -1 || gb !== -1) return (ga === -1 ? 99 : ga) - (gb === -1 ? 99 : gb)
    return label(a).localeCompare(label(b), locale)
  })
}

/** Built-ins plus the user's own games (custom ones first). */
export function allGames(custom: State['games']): GameDef[] {
  const mine = Object.values(custom)
    .filter((g) => !g.deleted)
    .sort((a, b) => b.updatedAt - a.updatedAt)
  return [...mine, ...BUILTIN_GAMES]
}

export function findGame(id: string): GameDef | undefined {
  return getState().games[id] ?? BUILTIN_GAMES.find((g) => g.id === id)
}

export function useActiveSessions(): Session[] {
  const sessions = useStore((s) => s.sessions)
  return Object.values(sessions)
    .filter((s) => !s.deleted && !s.finishedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Most recently played game ids, newest first, without duplicates. */
export function recentGameIds(sessions: State['sessions'], limit = 6): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of Object.values(sessions)
    .filter((s) => !s.deleted)
    .sort((a, b) => b.startedAt - a.startedAt)) {
    if (seen.has(s.gameId)) continue
    seen.add(s.gameId)
    out.push(s.gameId)
    if (out.length === limit) break
  }
  return out
}

export function startSession(game: GameDef, players: Player[], opts: { lowWins: boolean; target?: number }): Session {
  const now = Date.now()
  const session: Session = {
    id: uid(),
    gameId: game.id,
    emoji: game.emoji,
    rules: {
      name: game.name,
      mode: game.mode,
      lowWins: opts.lowWins,
      target: opts.target,
      categories: game.categories,
      bonus: game.bonus,
      steps: game.steps,
      zeroSum: game.zeroSum,
    },
    seats: players.map((p) => ({ id: p.id, name: p.name, color: p.color })),
    rounds: [],
    log: [],
    sheet: {},
    startedAt: now,
    updatedAt: now,
  }
  saveSession(session)
  return session
}
