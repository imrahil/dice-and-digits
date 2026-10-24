import { PLAYER_COLORS } from '../data/presets'
import type { Player } from '../types'

export function nextColor(players: Player[]): string {
  const used = new Set(players.filter((p) => !p.deleted).map((p) => p.color))

  return PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[players.length % PLAYER_COLORS.length]
}
