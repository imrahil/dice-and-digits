import { describe, expect, it } from 'vitest'
import type { Session } from '../types'
import { gameStats, headToHead, overview, playerStats } from './stats'

const seat = (id: string) => ({ id, name: id.toUpperCase(), color: '#000' })

function game(id: string, scores: Record<string, number>, opts: Partial<Session> = {}): Session {
  return {
    id,
    gameId: 'catan',
    emoji: '🏝️',
    rules: { name: 'Catan', mode: 'rounds', lowWins: false },
    seats: Object.keys(scores).map(seat),
    rounds: [scores],
    log: [],
    sheet: {},
    startedAt: 0,
    finishedAt: 30 * 60000,
    updatedAt: 0,
    ...opts,
  }
}

const sessions = [
  game('1', { a: 10, b: 7 }),
  game('2', { a: 6, b: 9 }),
  game('3', { a: 8, b: 8, c: 2 }), // a & b share the win
  game('4', { a: 12 }), // solo: counts as a play, not a win
  game('5', { a: 99, b: 0 }, { finishedAt: undefined }), // in progress: ignored
  game('6', { a: 50, b: 0 }, { deleted: true }), // deleted: ignored
]

describe('stats', () => {
  it('overview counts only finished, undeleted games', () => {
    expect(overview(sessions)).toEqual({ games: 4, minutes: 120, players: 3 })
  })

  it('player stats: shared wins count for everyone, solo games have no winner', () => {
    const rows = Object.fromEntries(playerStats(sessions, {}).map((r) => [r.id, r]))

    expect(rows.a).toMatchObject({ plays: 4, wins: 2 })
    expect(rows.a.winRate).toBeCloseTo(2 / 3)
    expect(rows.b).toMatchObject({ plays: 3, wins: 2, winRate: 2 / 3 })
    expect(rows.c).toMatchObject({ plays: 1, wins: 0, winRate: 0 })
  })

  it('roster names win over the name stored in old games', () => {
    const rows = playerStats(sessions, { a: { id: 'a', name: 'Ania', color: '#f00', updatedAt: 1 } })

    expect(rows.find((r) => r.id === 'a')?.name).toBe('Ania')
  })

  it('game stats keep the record and the average winning score', () => {
    const [g] = gameStats(sessions)

    expect(g.plays).toBe(4)
    expect(g.record).toMatchObject({ total: 12, name: 'A' })
    expect(g.avgWinning).toBe(Math.round((10 + 9 + 8 + 12) / 4))
  })

  it('head to head', () => {
    expect(headToHead(sessions, 'a', 'b')).toEqual({ games: 3, aAhead: 1, bAhead: 1, draws: 1 })
  })
})
