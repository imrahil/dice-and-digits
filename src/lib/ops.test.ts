import { describe, expect, it } from 'vitest'
import type { Rules, Session } from '../types'
import { applyOp, applyRemote, nextRound, nextRoundFor, type Op } from './ops'
import { totals } from './scoring'

const seats = [
  { id: 'a', name: 'A', color: '#000' },
  { id: 'b', name: 'B', color: '#000' },
]

const make = (rules: Partial<Rules>, patch: Partial<Session> = {}): Session => ({
  id: 's',
  gameId: 'g',
  emoji: '🎲',
  rules: { name: 'T', mode: 'counter', lowWins: false, ...rules },
  seats,
  rounds: [],
  log: [],
  sheet: {},
  startedAt: 0,
  updatedAt: 0,
  ...patch,
})

describe('applyOp', () => {
  it('adds to a counter', () => {
    const s = applyOp(make({}), { kind: 'add', p: 'a', d: 5, at: 1 })!
    expect(s.log).toEqual([{ p: 'a', d: 5, t: 1 }])
  })

  it('sets and clears sheet cells, only for known categories', () => {
    const rules = { mode: 'sheet' as const, categories: [{ id: 'x', name: 'X' }] }
    let s = applyOp(make(rules), { kind: 'cell', p: 'a', cat: 'x', v: 7 })!
    expect(s.sheet.x).toEqual({ a: 7 })
    s = applyOp(s, { kind: 'cell', p: 'a', cat: 'x', v: null })!
    expect(s.sheet.x).toEqual({})
    expect(applyOp(make(rules), { kind: 'cell', p: 'a', cat: 'nope', v: 1 })).toBeNull()
  })

  it('merges a round index from several phones into one row', () => {
    let s = make({ mode: 'rounds' })
    s = applyOp(s, { kind: 'round', p: 'b', index: 0, v: -60 })!
    s = applyOp(s, { kind: 'round', p: 'a', index: 0, v: 120 })!
    expect(s.rounds).toEqual([{ a: 120, b: -60 }])
    expect(applyOp(s, { kind: 'round', p: 'a', index: 5, v: 1 })).toBeNull()
  })

  it('rejects ops for the wrong mode, unknown players or finished games', () => {
    expect(applyOp(make({ mode: 'rounds' }), { kind: 'add', p: 'a', d: 1 })).toBeNull()
    expect(applyOp(make({}), { kind: 'add', p: 'zz', d: 1 })).toBeNull()
    expect(applyOp(make({}, { finishedAt: 1 }), { kind: 'add', p: 'a', d: 1 })).toBeNull()
  })
})

describe('applyRemote', () => {
  it('applies each op once, even when resent', () => {
    const ops: Op[] = [
      { id: '1', kind: 'add', p: 'a', d: 3 },
      { id: '2', kind: 'add', p: 'b', d: 2 },
    ]
    const first = applyRemote(make({}), ops)
    expect(first.applied).toEqual(['1', '2'])
    expect(totals(first.session)).toEqual({ a: 3, b: 2 })

    const again = applyRemote(first.session, [ops[0]])
    expect(again.applied).toEqual(['1'])
    expect(totals(again.session)).toEqual({ a: 3, b: 2 })
  })

  it('reports ops that do not fit', () => {
    const r = applyRemote(make({}), [{ id: 'x', kind: 'round', p: 'a', index: 0, v: 1 }])
    expect(r.rejected).toEqual(['x'])
    expect(r.session.ops).toBeUndefined()
  })
})

describe('next round helpers', () => {
  const s = make({ mode: 'rounds' }, { rounds: [{ a: 1, b: 2 }, { b: 5 }] })
  it('the host fills the first incomplete round', () => {
    expect(nextRound(s)).toBe(1)
    expect(nextRound({ ...s, rounds: [{ a: 1, b: 2 }] })).toBe(1)
  })
  it('a player fills their own first gap', () => {
    expect(nextRoundFor(s, 'a')).toBe(1)
    expect(nextRoundFor(s, 'b')).toBe(2)
  })
})
