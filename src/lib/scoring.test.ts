import { describe, expect, it } from 'vitest'
import { BUILTIN_GAMES } from '../data/presets'
import type { Rules, Session } from '../types'
import { gapsToLeader, isEmpty, leaders, marginOfVictory, standings, targetProgress, targetReached, toTarget, totals } from './scoring'

const seats = [
  { id: 'a', name: 'Anna', color: '#e4572e' },
  { id: 'b', name: 'Bartek', color: '#2e86de' },
  { id: 'c', name: 'Cleo', color: '#2a9d5c' },
]

function session(rules: Partial<Rules>, patch: Partial<Session> = {}): Session {
  return {
    id: 's',
    gameId: 'g',
    emoji: '🎲',
    rules: { name: 'Test', mode: 'rounds', lowWins: false, ...rules },
    seats,
    rounds: [],
    log: [],
    sheet: {},
    startedAt: 0,
    updatedAt: 0,
    ...patch,
  }
}

describe('totals', () => {
  it('sums counter deltas per player', () => {
    const s = session({ mode: 'counter' }, { log: [{ p: 'a', d: 5, t: 0 }, { p: 'a', d: -2, t: 0 }, { p: 'b', d: 1, t: 0 }] })

    expect(totals(s)).toEqual({ a: 3, b: 1, c: 0 })
  })

  it('sums rounds, treating a missing entry as 0', () => {
    const s = session({ mode: 'rounds' }, { rounds: [{ a: 10, b: -5 }, { a: 1, b: 2, c: 3 }] })

    expect(totals(s)).toEqual({ a: 11, b: -3, c: 3 })
  })

  it('subtracts negative categories on a sheet', () => {
    const ttr = BUILTIN_GAMES.find((g) => g.id === 'builtin:ttr')!
    const s = session(ttr, { sheet: { routes: { a: 40 }, tickets: { a: 20 }, failed: { a: 12 } } })

    expect(totals(s).a).toBe(48)
  })

  it('awards the Yahtzee upper bonus at 63', () => {
    const y = BUILTIN_GAMES.find((g) => g.id === 'builtin:yahtzee')!
    const upper = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 } // exactly 63
    const sheet: Session['sheet'] = {}

    for (const [k, v] of Object.entries(upper)) {
      sheet[k] = { a: v, b: k === 'sixes' ? v - 6 : v }
    }

    const t = totals(session(y, { sheet }))

    expect(t.a).toBe(63 + 35)
    expect(t.b).toBe(57)
  })
})

describe('category multipliers', () => {
  const rules = {
    mode: 'sheet' as const,
    categories: [
      { id: 'up', name: 'Upgrades', per: 2 },
      { id: 'bad', name: 'Bad reviews', negative: true },
      { id: 'coins', name: 'Coins', div: 3 },
      { id: 'st', name: 'Stations', per: 4, negative: true },
    ],
  }

  it('turns counts into points', () => {
    const s = session(rules, { sheet: { up: { a: 3 }, bad: { a: 2 }, coins: { a: 14 }, st: { a: 1 } } })

    // 3×2 − 2 + floor(14/3) − 4
    expect(totals(s).a).toBe(6 - 2 + 4 - 4)
  })
  it('counts empty cells as nothing', () => {
    expect(totals(session(rules)).a).toBe(0)
  })
})

describe('winner mode', () => {
  it('counts rounds won, and with lowWins the fewest losses wins', () => {
    const rounds: Record<string, number>[] = [{ a: 1 }, { b: 1 }, { a: 1 }]

    expect(totals(session({ mode: 'winner' }, { rounds }))).toEqual({ a: 2, b: 1, c: 0 })
    expect(standings(session({ mode: 'winner', lowWins: true }, { rounds }))[0].seat.id).toBe('c')
  })
})

describe('standings', () => {
  it('ranks high-wins with shared ranks for ties', () => {
    const s = session({}, { rounds: [{ a: 10, b: 10, c: 5 }] })

    expect(standings(s).map((r) => [r.seat.id, r.rank])).toEqual([['a', 1], ['b', 1], ['c', 3]])
    expect(leaders(s)).toEqual(['a', 'b'])
  })

  it('ranks low-wins ascending', () => {
    const s = session({ lowWins: true }, { rounds: [{ a: 10, b: 3, c: 5 }] })

    expect(standings(s).map((r) => r.seat.id)).toEqual(['b', 'c', 'a'])
  })

  it('a tie-break promotes one player and leaves the rest of the tie second', () => {
    const s = session({}, { rounds: [{ a: 10, b: 10, c: 10 }], tieBreak: 'c' })

    expect(standings(s).map((r) => [r.seat.id, r.rank])).toEqual([['c', 1], ['a', 2], ['b', 2]])
    expect(leaders(s)).toEqual(['c'])
  })
})

describe('target and emptiness', () => {
  it('detects a reached target', () => {
    expect(targetReached(session({ target: 100 }, { rounds: [{ a: 99 }] }))).toBe(false)
    expect(targetReached(session({ target: 100 }, { rounds: [{ a: 100 }] }))).toBe(true)
    expect(targetReached(session({}, { rounds: [{ a: 1000 }] }))).toBe(false)
  })

  it('knows when nothing was scored', () => {
    expect(isEmpty(session({ mode: 'sheet' }, { sheet: { x: {} } }))).toBe(true)
    expect(isEmpty(session({ mode: 'sheet' }, { sheet: { x: { a: 0 } } }))).toBe(false)
  })
})

describe('distance to the target and the leader', () => {
  it('counts down to the target and stops at 0', () => {
    expect(toTarget(8, 10)).toBe(2)
    expect(toTarget(12, 10)).toBe(0)
    expect(toTarget(5)).toBeNull()
  })

  it('fills a progress bar from 0 to 1', () => {
    expect(targetProgress(-40, 1000)).toBe(0)
    expect(targetProgress(500, 1000)).toBe(0.5)
    expect(targetProgress(1200, 1000)).toBe(1)
    expect(targetProgress(5)).toBeNull()
  })

  it('measures each gap from rank 1, whichever way the game is won', () => {
    expect(gapsToLeader(standings(session({}, { rounds: [{ a: 8, b: 6, c: 5 }] })))).toEqual([0, 2, 3])
    expect(gapsToLeader(standings(session({ lowWins: true }, { rounds: [{ a: 23, b: 31, c: 40 }] })))).toEqual([0, 8, 17])
    expect(gapsToLeader(standings(session({}, { rounds: [{ a: 9, b: 9, c: 4 }] })))).toEqual([0, 0, 5])
    expect(gapsToLeader([])).toEqual([])
    // Tysiąc can go negative: −100 sorts last and sits 150 behind.
    expect(gapsToLeader(standings(session({}, { seats: seats.slice(0, 2), rounds: [{ a: -100, b: 50 }] })))).toEqual([0, 150])
  })
})

describe('margin of victory', () => {
  const four = [...seats, { id: 'd', name: 'Daria', color: '#f2b134' }]

  it('is the gap to the next distinct score', () => {
    expect(marginOfVictory(standings(session({}, { seats: four, rounds: [{ a: 56, b: 44, c: 62, d: 51 }] })))).toBe(6)
    expect(marginOfVictory(standings(session({ lowWins: true }, { seats: seats.slice(0, 2), rounds: [{ a: 31, b: 23 }] })))).toBe(8)
  })

  it('is 0 for a tie at the top or a single player', () => {
    expect(marginOfVictory(standings(session({}, { rounds: [{ a: 10, b: 10, c: 4 }] })))).toBe(0)
    expect(marginOfVictory(standings(session({}, { seats: seats.slice(0, 1), rounds: [{ a: 7 }] })))).toBe(0)
  })
})
