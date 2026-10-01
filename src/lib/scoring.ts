import type { Rules, Session, Standing } from '../types'

type Scored = Pick<Session, 'rules' | 'seats' | 'rounds' | 'log' | 'sheet' | 'tieBreak'>

/** The bonus a player has earned on a score sheet (0 when not reached). */
export function sheetBonus(rules: Rules, sheet: Session['sheet'], playerId: string): number {
  const b = rules.bonus
  if (!b) return 0
  const sum = b.of.reduce((acc, c) => acc + (sheet[c]?.[playerId] ?? 0), 0)
  return sum >= b.atLeast ? b.points : 0
}

/** How far a player still is from the bonus threshold (0 = reached). */
export function bonusMissing(rules: Rules, sheet: Session['sheet'], playerId: string): number {
  const b = rules.bonus
  if (!b) return 0
  const sum = b.of.reduce((acc, c) => acc + (sheet[c]?.[playerId] ?? 0), 0)
  return Math.max(0, b.atLeast - sum)
}

export function playerTotal(s: Scored, playerId: string): number {
  switch (s.rules.mode) {
    case 'counter':
      return s.log.reduce((acc, e) => (e.p === playerId ? acc + e.d : acc), 0)
    case 'rounds':
      return s.rounds.reduce((acc, r) => acc + (r[playerId] ?? 0), 0)
    case 'sheet': {
      let total = 0
      for (const c of s.rules.categories ?? []) {
        const v = s.sheet[c.id]?.[playerId] ?? 0
        total += c.negative ? -Math.abs(v) : v
      }
      return total + sheetBonus(s.rules, s.sheet, playerId)
    }
  }
}

export function totals(s: Scored): Record<string, number> {
  const out: Record<string, number> = {}
  for (const seat of s.seats) out[seat.id] = playerTotal(s, seat.id)
  return out
}

/**
 * Best first, standard competition ranking (1, 1, 3). A tie-break moves the
 * chosen player alone to rank 1; the rest of that tie shares rank 2.
 */
export function standings(s: Scored): Standing[] {
  const t = totals(s)
  const dir = s.rules.lowWins ? 1 : -1
  const sorted = s.seats
    .map((seat, i) => ({ seat, total: t[seat.id], i }))
    .sort((a, b) => {
      if (a.total !== b.total) return dir * (a.total - b.total)
      if (s.tieBreak === a.seat.id) return -1
      if (s.tieBreak === b.seat.id) return 1
      return a.i - b.i // keep seat order inside a tie
    })

  const out: Standing[] = []
  sorted.forEach((row, i) => {
    const prev = out[i - 1]
    let rank = prev && prev.total === row.total ? prev.rank : i + 1
    if (prev && prev.rank === 1 && prev.seat.id === s.tieBreak && prev.total === row.total) rank = 2
    out.push({ seat: row.seat, total: row.total, rank })
  })
  return out
}

/** Player ids sharing first place (more than one = unresolved tie). */
export function leaders(s: Scored): string[] {
  if (s.seats.length === 0) return []
  return standings(s)
    .filter((r) => r.rank === 1)
    .map((r) => r.seat.id)
}

/** True once anyone has reached the target (≥ for high-wins, ≥ too for low-wins: the loser busts). */
export function targetReached(s: Scored): boolean {
  const target = s.rules.target
  if (target == null) return false
  return Object.values(totals(s)).some((v) => v >= target)
}

/** True when nobody has scored anything yet — finishing would record a 0:0 game. */
export function isEmpty(s: Scored): boolean {
  switch (s.rules.mode) {
    case 'counter':
      return s.log.length === 0
    case 'rounds':
      return s.rounds.length === 0
    case 'sheet':
      return Object.values(s.sheet).every((row) => Object.keys(row).length === 0)
  }
}
