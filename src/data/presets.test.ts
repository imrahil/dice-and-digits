import { describe, expect, it } from 'vitest'
import { BUILTIN_GAMES, PAWN_COLORS } from './presets'

describe('built-in games', () => {
  it('have unique, permanent-looking ids', () => {
    const ids = BUILTIN_GAMES.map((g) => g.id)

    expect(new Set(ids).size).toBe(ids.length)

    for (const id of ids) {
      expect(id).toMatch(/^builtin:[a-z0-9-]+$/)
    }
  })

  it('score sheets have categories with unique ids and sane multipliers', () => {
    for (const g of BUILTIN_GAMES.filter((g) => g.mode === 'sheet')) {
      const cats = g.categories ?? []

      expect(cats.length, g.id).toBeGreaterThan(0)
      expect(new Set(cats.map((c) => c.id)).size, g.id).toBe(cats.length)

      for (const c of cats) {
        if (c.per != null) {
          expect(c.per, `${g.id}/${c.id}`).toBeGreaterThan(1)
        }

        if (c.div != null) {
          expect(c.div, `${g.id}/${c.id}`).toBeGreaterThan(1)
        }
      }
    }
  })

  it('only rounds games are zero-sum, counters have quick buttons', () => {
    for (const g of BUILTIN_GAMES) {
      if (g.zeroSum) {
        expect(g.mode, g.id).toBe('rounds')
      }

      if (g.mode === 'counter') {
        expect(g.steps?.length, g.id).toBeGreaterThan(0)
      }
    }
  })

  it('pawn palettes use known colours, without repeats', () => {
    const known = new Set(PAWN_COLORS.map((c) => c.hex))

    expect(known.size).toBe(PAWN_COLORS.length)

    for (const g of BUILTIN_GAMES.filter((g) => g.pawns)) {
      expect(new Set(g.pawns).size, g.id).toBe(g.pawns!.length)
      expect(g.pawns!.every((p) => known.has(p)), g.id).toBe(true)
    }
  })
})
