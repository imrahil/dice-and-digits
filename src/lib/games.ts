import { BUILTIN_GAMES } from '../data/presets'
import type { GameDef, Player, Session, Text } from '../types'
import { getState, saveSession, uid, useStore, type State } from './store'

const GENERIC = ['builtin:counter', 'builtin:rounds']

/** Built-ins for a list: the generic counter and rounds first, the rest A–Z in the current language. */
export function sortBuiltins(games: GameDef[], label: (g: GameDef) => string, locale: string): GameDef[] {
  return [...games].sort((a, b) => {
    const ga = GENERIC.indexOf(a.id)
    const gb = GENERIC.indexOf(b.id)

    if (ga !== -1 || gb !== -1) {
      return (ga === -1 ? 99 : ga) - (gb === -1 ? 99 : gb)
    }

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

/** Search by name in either language; `needle` is already lower-cased. */
export function matchesName(g: GameDef, needle: string): boolean {
  return !needle || (typeof g.name === 'string' ? [g.name] : [g.name.en, g.name.pl]).some((n) => n.toLocaleLowerCase().includes(needle))
}

/** My shelf, last hearted first, skipping deleted or unknown games. */
export function myGames(favorites: State['favorites'], custom: State['games']): GameDef[] {
  return Object.values(favorites)
    .filter((f) => !f.deleted)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((f) => custom[f.id] ?? BUILTIN_GAMES.find((g) => g.id === f.id))
    .filter((g): g is GameDef => !!g && !g.deleted)
}

/** A random game for tonight; with a choice, never the one drawn just before. */
export function drawGame(games: GameDef[], last?: string, random = Math.random): GameDef | undefined {
  const pool = games.length > 1 ? games.filter((g) => g.id !== last) : games

  return pool[Math.floor(random() * pool.length)]
}

/** The game editor's text fields, kept as typed until saving. */
export type EditorFields = { target: string; steps: string; timerMin: string; timerMax: string }

/**
 * What the game editor saves: the numbers parsed from its text fields, and
 * only the fields the chosen scoring mode uses.
 */
export function gameFromEditor(g: GameDef, fields: EditorFields, text: (v: Text) => string): GameDef {
  const steps = fields.steps
    .split(/[,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 4)
  const tgt = parseInt(fields.target, 10)
  // At least 3 s, and max never below min.
  const lo = Math.max(3, parseInt(fields.timerMin, 10) || 3)
  const hi = Math.max(lo, parseInt(fields.timerMax, 10) || lo)
  const categories = (g.categories ?? []).filter((c) => text(c.name).trim())

  return {
    ...g,
    name: text(g.name).trim(),
    target: Number.isFinite(tgt) && tgt > 0 ? tgt : undefined,
    steps: g.mode === 'counter' ? (steps.length ? steps : [1]) : undefined,
    categories: g.mode === 'sheet' ? categories.map((c) => ({ ...c, name: text(c.name).trim() })) : undefined,
    bonus: g.mode === 'sheet' ? g.bonus : undefined,
    zeroSum: g.mode === 'rounds' ? g.zeroSum : undefined,
    timer: g.mode === 'winner' && g.timer ? { hidden: g.timer.hidden, min: lo, max: hi } : undefined,
  }
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
    if (seen.has(s.gameId)) {
      continue
    }

    seen.add(s.gameId)
    out.push(s.gameId)

    if (out.length === limit) {
      break
    }
  }

  return out
}

export function startSession(
  game: GameDef,
  players: Player[],
  opts: { lowWins: boolean; target?: number; pawns?: Record<string, string> },
): Session {
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
      timer: game.mode === 'winner' ? game.timer : undefined,
    },
    seats: players.map((p) => {
      const pawn = opts.pawns?.[p.id]

      return pawn ? { id: p.id, name: p.name, color: p.color, pawn } : { id: p.id, name: p.name, color: p.color }
    }),
    rounds: [],
    log: [],
    sheet: {},
    startedAt: now,
    updatedAt: now,
  }

  saveSession(session)

  return session
}
