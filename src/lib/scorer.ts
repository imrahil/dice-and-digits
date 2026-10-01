import { applyOp, type OpBody } from './ops'
import { updateSession } from './store'

/**
 * What a scoring board needs from whoever is scoring: which seats it may
 * touch, and where ops go. The host phone edits every seat and applies ops to
 * the local store; a joined phone edits only its own seat and sends ops to the
 * room (see hooks/useRoom.ts).
 */
export type Scorer = {
  canEdit: (seatId: string) => boolean
  apply: (ops: OpBody[]) => void
}

export function hostScorer(sessionId: string): Scorer {
  return {
    canEdit: () => true,
    apply: (ops) => updateSession(sessionId, (s) => ops.reduce((acc, op) => applyOp(acc, op) ?? acc, s)),
  }
}
