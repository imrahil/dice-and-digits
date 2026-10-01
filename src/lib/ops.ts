import type { Session } from '../types'

/**
 * One scoring action. Every score change on the Play screen is an op, whether
 * it was tapped on the host phone or sent by a player who joined from their
 * own phone — so both go through exactly the same rules (applyOp).
 */
export type OpBody =
  | { kind: 'add'; p: string; d: number } // counter: +d for player p
  | { kind: 'cell'; p: string; cat: string; v: number | null } // sheet: set (or clear) one cell
  | { kind: 'round'; p: string; index: number; v: number } // rounds: p's score in round `index`

/** An op sent from a joined phone: carries an id so a resend is applied once. */
export type Op = OpBody & { id: string; at?: number }

/** How many applied remote op ids a session remembers. */
const REMEMBER = 300

/** Returns the updated session, or null when the op doesn't fit this game. */
export function applyOp(s: Session, op: OpBody & { at?: number }): Session | null {
  if (s.finishedAt || !s.seats.some((seat) => seat.id === op.p)) return null
  switch (op.kind) {
    case 'add':
      if (s.rules.mode !== 'counter' || !Number.isFinite(op.d) || op.d === 0) return null
      return { ...s, log: [...s.log, { p: op.p, d: op.d, t: op.at ?? Date.now() }] }

    case 'cell': {
      if (s.rules.mode !== 'sheet' || !s.rules.categories?.some((c) => c.id === op.cat)) return null
      if (op.v !== null && !Number.isFinite(op.v)) return null
      const row = { ...(s.sheet[op.cat] ?? {}) }
      if (op.v === null) delete row[op.p]
      else row[op.p] = op.v
      return { ...s, sheet: { ...s.sheet, [op.cat]: row } }
    }

    case 'round': {
      // Rounds are numbered in real life, so an index means "round N" for
      // everyone: a player's score and the host's entry for the same round
      // land in the same row. The next new round is the only gap allowed.
      if (s.rules.mode !== 'rounds' || !Number.isInteger(op.index) || op.index < 0 || op.index > s.rounds.length) return null
      if (!Number.isFinite(op.v)) return null
      const rounds = [...s.rounds]
      rounds[op.index] = { ...(rounds[op.index] ?? {}), [op.p]: op.v }
      return { ...s, rounds }
    }
  }
}

/** Apply ops from joined phones, skipping ones already applied. */
export function applyRemote(s: Session, ops: Op[]) {
  const seen = new Set(s.ops ?? [])
  const applied: string[] = []
  const rejected: string[] = []
  let next = s
  for (const op of ops) {
    if (seen.has(op.id)) {
      applied.push(op.id) // already in: just ack it again
      continue
    }
    const r = applyOp(next, op)
    if (r) {
      next = r
      applied.push(op.id)
      seen.add(op.id)
    } else rejected.push(op.id)
  }
  if (next !== s) next = { ...next, ops: [...(s.ops ?? []), ...applied.filter((id) => !s.ops?.includes(id))].slice(-REMEMBER) }
  return { session: next, applied, rejected }
}

/** The round a player should fill next: their first gap, else a new round. */
export function nextRoundFor(s: Session, p: string): number {
  const gap = s.rounds.findIndex((r) => r[p] == null)
  return gap === -1 ? s.rounds.length : gap
}

/** The round the host's "Add round" opens: the first incomplete one, else a new one. */
export function nextRound(s: Session): number {
  const gap = s.rounds.findIndex((r) => s.seats.some((seat) => r[seat.id] == null))
  return gap === -1 ? s.rounds.length : gap
}
