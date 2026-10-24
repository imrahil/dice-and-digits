// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BUILTIN_GAMES } from '../data/presets'
import type { GameDef, Player } from '../types'

let games: typeof import('./games')
let store: typeof import('./store')

beforeEach(async () => {
  localStorage.clear()
  vi.resetModules()
  store = await import('./store')
  games = await import('./games')
})

const custom = (id: string, updatedAt: number, patch: Partial<GameDef> = {}): GameDef => ({
  id,
  name: id,
  emoji: '🎲',
  mode: 'counter',
  lowWins: false,
  updatedAt,
  ...patch,
})

describe('game lists', () => {
  it('sortBuiltins puts the generic games first, then A–Z in the given language', () => {
    const label = (g: GameDef) => (typeof g.name === 'string' ? g.name : g.name.pl)
    const sorted = games.sortBuiltins(BUILTIN_GAMES, label, 'pl')
    const names = sorted.map(label)

    expect(sorted.slice(0, 2).map((g) => g.id)).toEqual(['builtin:counter', 'builtin:rounds'])
    expect(names.slice(2)).toEqual([...names.slice(2)].sort((a, b) => a.localeCompare(b, 'pl')))
  })

  it('allGames lists custom games first (newest first) and hides deleted ones', () => {
    const list = games.allGames({
      old: custom('old', 1),
      new: custom('new', 2),
      gone: custom('gone', 3, { deleted: true }),
    })

    expect(list.slice(0, 2).map((g) => g.id)).toEqual(['new', 'old'])
    expect(list.find((g) => g.id === 'gone')).toBeUndefined()
    expect(list).toHaveLength(2 + BUILTIN_GAMES.length)
  })

  it('findGame looks in custom games, then built-ins', () => {
    store.saveGame(custom('mine', 1))

    expect(games.findGame('mine')?.id).toBe('mine')
    expect(games.findGame('builtin:catan')?.id).toBe('builtin:catan')
    expect(games.findGame('nope')).toBeUndefined()
  })
})

describe('my games', () => {
  it('myGames lists the last hearted first, skipping unhearted, deleted or unknown games', () => {
    const fav = (id: string, updatedAt: number, deleted?: boolean) => ({ id, updatedAt, deleted })
    const list = games.myGames(
      {
        mine: fav('mine', 4),
        gone: fav('gone', 5),
        'builtin:catan': fav('builtin:catan', 3),
        'builtin:uno': fav('builtin:uno', 6, true),
        nope: fav('nope', 7),
      },
      { mine: custom('mine', 1), gone: custom('gone', 2, { deleted: true }) },
    )

    expect(list.map((g) => g.id)).toEqual(['mine', 'builtin:catan'])
  })

  it('matchesName searches both languages of a built-in', () => {
    const catan = games.findGame('builtin:catan')!

    expect(games.matchesName(catan, '')).toBe(true)
    expect(games.matchesName(catan, 'catan')).toBe(true)
    expect(games.matchesName(custom('Mine', 1), 'zzz')).toBe(false)
  })

  it('drawGame picks from the list, never the previous pick when there is a choice', () => {
    const list = [custom('a', 1), custom('b', 1), custom('c', 1)]

    expect(games.drawGame(list, undefined, () => 0)?.id).toBe('a')
    expect(games.drawGame(list, undefined, () => 0.99)?.id).toBe('c')
    expect(games.drawGame(list, 'a', () => 0)?.id).toBe('b')

    for (let i = 0; i < 50; i++) {
      expect(games.drawGame(list, 'b')?.id).not.toBe('b')
    }

    expect(games.drawGame([list[0]], 'a')?.id).toBe('a')
    expect(games.drawGame([])).toBeUndefined()
  })
})

describe('starting a game', () => {
  const players: Player[] = [
    { id: 'a', name: 'Anna', color: '#e4572e', updatedAt: 0 },
    { id: 'b', name: 'Bart', color: '#2e86de', updatedAt: 0 },
  ]

  it('snapshots the rules and the seats into a new session', () => {
    const rummikub = games.findGame('builtin:rummikub')!
    const s = games.startSession(rummikub, players, { lowWins: true, target: 100 })

    expect(s.rules).toMatchObject({ mode: 'rounds', lowWins: true, target: 100, zeroSum: true })
    expect(s.seats).toEqual([
      { id: 'a', name: 'Anna', color: '#e4572e' },
      { id: 'b', name: 'Bart', color: '#2e86de' },
    ])
    expect(store.getState().sessions[s.id]).toBeDefined()
  })

  it('snapshots chosen pawn colours, leaving seats without one untouched', () => {
    const s = games.startSession(games.findGame('builtin:ttr')!, players, { lowWins: false, pawns: { a: '#2a2a2e' } })

    expect(s.seats).toEqual([
      { id: 'a', name: 'Anna', color: '#e4572e', pawn: '#2a2a2e' },
      { id: 'b', name: 'Bart', color: '#2e86de' },
    ])
  })

  it('later edits to the game definition do not change a started session', () => {
    store.saveGame(custom('mine', 1, { mode: 'sheet', categories: [{ id: 'x', name: 'X', per: 2 }] }))

    const s = games.startSession(games.findGame('mine')!, players, { lowWins: false })

    store.saveGame(custom('mine', 2, { mode: 'sheet', categories: [{ id: 'x', name: 'Renamed', per: 5 }] }))
    expect(store.getState().sessions[s.id].rules.categories).toEqual([{ id: 'x', name: 'X', per: 2 }])
  })

  it('recentGameIds lists distinct games, newest first, skipping deleted sessions', () => {
    const start = (id: string, at: number) => {
      vi.setSystemTime(at)
      games.startSession(games.findGame(id)!, players, { lowWins: false })
    }

    vi.useFakeTimers()
    start('builtin:catan', 1)
    start('builtin:uno', 2)
    start('builtin:catan', 3)
    start('builtin:1000', 4)

    const tysiac = Object.values(store.getState().sessions).find((s) => s.gameId === 'builtin:1000')!

    store.removeSession(tysiac.id)
    vi.useRealTimers()

    expect(games.recentGameIds(store.getState().sessions)).toEqual(['builtin:catan', 'builtin:uno'])
    expect(games.recentGameIds(store.getState().sessions, 1)).toEqual(['builtin:catan'])
  })
})
