import { describe, expect, it } from 'vitest'
import { PAWN_COLORS } from '../data/presets'
import type { Session } from '../types'
import { autoAssign, choosePawn, isLight, lastPawns, needsOutline, paletteFor, seatColor } from './pawns'

const hex = (en: string) => PAWN_COLORS.find((c) => typeof c.name !== 'string' && c.name.en === en)!.hex
const [RED, BLUE, GREEN, BLACK, WHITE] = ['Red', 'Blue', 'Green', 'Black', 'White'].map(hex)

describe('pawn colours', () => {
  it('a seat shows its pawn, or its roster colour without one', () => {
    expect(seatColor({ color: '#111111', pawn: RED })).toBe(RED)
    expect(seatColor({ color: '#111111' })).toBe('#111111')
  })

  it('a game offers its own palette, or every pawn colour', () => {
    expect(paletteFor({ pawns: [RED, BLUE] })).toEqual([RED, BLUE])
    expect(paletteFor({})).toHaveLength(PAWN_COLORS.length)
  })

  it('white pawns get dark initials; white and black pawns get an outline', () => {
    expect(isLight(WHITE)).toBe(true)
    expect(isLight(BLACK)).toBe(false)
    expect(isLight(hex('Yellow'))).toBe(false)
    expect(needsOutline(WHITE)).toBe(true)
    expect(needsOutline(BLACK)).toBe(true)
    expect(needsOutline(RED)).toBe(false)
  })

  it('autoAssign prefers last time, then the roster colour family, then the first free pawn', () => {
    const palette = [RED, BLUE, GREEN]
    const roster = { a: { color: '#2e86de' }, b: { color: '#2e86de' }, c: { color: '#5c6370' } }

    // a played green last time; b's roster blue matches the blue pawn; c gets what's left.
    expect(autoAssign(['a', 'b', 'c'], palette, {}, { a: GREEN }, roster)).toEqual({ a: GREEN, b: BLUE, c: RED })
  })

  it('autoAssign keeps choices, never duplicates, and leaves extra players without a pawn', () => {
    const out = autoAssign(['a', 'b', 'c'], [RED, BLUE], { b: RED, gone: BLUE }, { a: RED })

    expect(out).toEqual({ b: RED, a: BLUE })
    expect(autoAssign(['a'], [RED], { a: '#123456' })).toEqual({ a: RED })
  })

  it('choosing a taken colour swaps the two seats', () => {
    expect(choosePawn({ a: RED, b: BLUE }, 'a', BLUE)).toEqual({ a: BLUE, b: RED })
    expect(choosePawn({ b: BLUE }, 'a', BLUE)).toEqual({ a: BLUE })
    expect(choosePawn({ a: RED }, 'a', null)).toEqual({})
  })

  it('lastPawns reads the latest undeleted session of that game only', () => {
    const s = (id: string, gameId: string, startedAt: number, pawn?: string, deleted?: boolean) =>
      ({ id, gameId, startedAt, deleted, seats: [{ id: 'a', name: 'A', color: '#000', pawn }] }) as Session
    const sessions = {
      1: s('1', 'ttr', 1, RED),
      2: s('2', 'ttr', 2, BLUE),
      3: s('3', 'ttr', 3, GREEN, true),
      4: s('4', 'uno', 4, BLACK),
    }

    expect(lastPawns(sessions, 'ttr')).toEqual({ a: BLUE })
    expect(lastPawns({ ...sessions, 5: s('5', 'ttr', 5) }, 'ttr')).toBeUndefined()
    expect(lastPawns(sessions, 'catan')).toBeUndefined()
  })
})
