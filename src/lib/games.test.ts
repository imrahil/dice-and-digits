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

  it('fitsPlayers: inside the range fits, no max means no limit, no range fits anyone', () => {
    const catan = custom('c', 1, { players: { min: 3, max: 4 } })
    const potato = custom('p', 1, { players: { min: 2 } })

    expect([2, 3, 4, 5].map((n) => games.fitsPlayers(catan, n))).toEqual([false, true, true, false])
    expect(games.fitsPlayers(potato, 1)).toBe(false)
    expect(games.fitsPlayers(potato, 12)).toBe(true)
    expect(games.fitsPlayers(custom('x', 1), 1)).toBe(true)
  })

  it('formatPlayers writes a range, an open range or a single count', () => {
    expect(games.formatPlayers({ min: 3, max: 4 })).toBe('3–4')
    expect(games.formatPlayers({ min: 2 })).toBe('2+')
    expect(games.formatPlayers({ min: 2, max: 2 })).toBe('2')
  })

  it('lastTableSize is the seat count of the most recently started game', () => {
    expect(games.lastTableSize({})).toBeUndefined()

    const at = (n: number, startedAt: number, deleted?: boolean) =>
      ({ id: `s${startedAt}`, seats: Array.from({ length: n }, (_, i) => ({ id: `${i}`, name: '', color: '' })), startedAt, deleted }) as never

    expect(games.lastTableSize({ a: at(4, 1), b: at(5, 3), c: at(2, 2), d: at(6, 9, true) })).toBe(5)
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

describe('game editor', () => {
  const fields = { target: '', steps: '1, 5, 10', timerMin: '10', timerMax: '30', playersMin: '', playersMax: '' }
  const label = (v: GameDef['name']) => (typeof v === 'string' ? v : v.en)

  it('parses quick buttons and the target, keeping only what the mode uses', () => {
    const g = games.gameFromEditor(
      custom(' Mine ', 1, { mode: 'counter', zeroSum: true, categories: [{ id: 'a', name: 'A' }], timer: { hidden: true, min: 5, max: 9 } }),
      { ...fields, target: '100', steps: '2 x, 0, 3,4;5, 6, 7' },
      label,
    )

    expect(g).toMatchObject({ name: 'Mine', target: 100, steps: [2, 3, 4, 6] })
    expect(g.categories).toBeUndefined()
    expect(g.zeroSum).toBeUndefined()
    expect(g.timer).toBeUndefined()
    expect(games.gameFromEditor(custom('c', 1), { ...fields, steps: 'none', target: '-5' }, label)).toMatchObject({ steps: [1], target: undefined })
  })

  it('drops unnamed categories and trims the rest on a score sheet', () => {
    const g = games.gameFromEditor(
      custom('s', 1, { mode: 'sheet', categories: [{ id: 'a', name: ' Gold ' }, { id: 'b', name: '  ' }], bonus: { name: 'B', of: ['a'], atLeast: 1, points: 5 } }),
      fields,
      label,
    )

    expect(g.categories).toEqual([{ id: 'a', name: 'Gold' }])
    expect(g.bonus?.points).toBe(5)
    expect(g.steps).toBeUndefined()
  })

  it('reads the player range: a max alone means up to it, a max below the min is dropped', () => {
    const players = (playersMin: string, playersMax: string) => games.gameFromEditor(custom('g', 1), { ...fields, playersMin, playersMax }, label).players

    expect(players('3', '4')).toEqual({ min: 3, max: 4 })
    expect(players('2', '')).toEqual({ min: 2 })
    expect(players('', '6')).toEqual({ min: 1, max: 6 })
    expect(players('5', '3')).toEqual({ min: 5 })
    expect(players('', '')).toBeUndefined()
    expect(players('0', 'x')).toBeUndefined()
  })

  it('keeps the round timer at 3 s or more, with max never below min', () => {
    const potato = (timerMin: string, timerMax: string) =>
      games.gameFromEditor(custom('p', 1, { mode: 'winner', timer: { hidden: false, min: 0, max: 0 } }), { ...fields, timerMin, timerMax }, label).timer

    expect(potato('1', '2')).toEqual({ hidden: false, min: 3, max: 3 })
    expect(potato('20', '10')).toEqual({ hidden: false, min: 20, max: 20 })
    expect(potato('', 'x')).toEqual({ hidden: false, min: 3, max: 3 })
    expect(potato('8', '25')).toEqual({ hidden: false, min: 8, max: 25 })
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
