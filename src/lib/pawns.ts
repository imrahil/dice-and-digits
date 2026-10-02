import { PAWN_COLORS } from '../data/presets'
import type { GameDef, Player, Seat, Session, Text } from '../types'

/** The colour a seat shows inside its session: the pawn if one was chosen, else the roster colour. */
export function seatColor(seat: Pick<Seat, 'color' | 'pawn'>): string {
  return seat.pawn ?? seat.color
}

export function pawnName(hex: string): Text | undefined {
  return PAWN_COLORS.find((c) => c.hex === hex)?.name
}

/** Pawn colours offered for a game: its own palette, or every colour we know. */
export function paletteFor(game: Pick<GameDef, 'pawns'>): string[] {
  return game.pawns?.length ? game.pawns : PAWN_COLORS.map((c) => c.hex)
}

/** Relative luminance (WCAG), 0 = black, 1 = white. */
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)

  if (!m) {
    return 0.2
  }

  const n = parseInt(m[1], 16)
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255

    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Whether initials on this background should be dark instead of white (a white pawn). */
export function isLight(hex: string): boolean {
  return luminance(hex) > 0.7
}

/** Near-white or near-black colours that vanish on a light or dark card without an outline. */
export function needsOutline(hex: string): boolean {
  const l = luminance(hex)

  return l > 0.7 || l < 0.03
}

/** The latest session of this game, if it used pawns. */
export function lastPawns(sessions: Record<string, Session>, gameId: string): Record<string, string> | undefined {
  const last = Object.values(sessions)
    .filter((s) => !s.deleted && s.gameId === gameId)
    .sort((a, b) => b.startedAt - a.startedAt)[0]

  if (!last?.seats.some((s) => s.pawn)) {
    return undefined
  }

  return Object.fromEntries(last.seats.filter((s) => s.pawn).map((s) => [s.id, s.pawn as string]))
}

/**
 * Gives every seat without a pawn a free one: the pawn it had last time, then
 * one resembling its roster colour, then the first free. Seats beyond the
 * palette get none and fall back to their roster colour. Existing choices for
 * seated players are kept; choices for players no longer seated are dropped.
 */
export function autoAssign(
  ids: string[],
  palette: string[],
  current: Record<string, string>,
  last: Record<string, string> = {},
  roster: Record<string, Pick<Player, 'color'>> = {},
): Record<string, string> {
  const out: Record<string, string> = {}
  const taken = new Set<string>()

  for (const id of ids) {
    const c = current[id]

    if (c && palette.includes(c) && !taken.has(c)) {
      out[id] = c
      taken.add(c)
    }
  }

  const free = (c: string | undefined) => !!c && palette.includes(c) && !taken.has(c)

  for (const id of ids) {
    if (out[id]) {
      continue
    }

    const family = PAWN_COLORS.find((c) => c.family === roster[id]?.color)?.hex
    const pick = [last[id], family].find(free) ?? palette.find((c) => !taken.has(c))

    if (pick) {
      out[id] = pick
      taken.add(pick)
    }
  }

  return out
}

/** Sets a seat's pawn; if another seat holds that colour, the two swap. */
export function choosePawn(pawns: Record<string, string>, id: string, hex: string | null): Record<string, string> {
  const out = { ...pawns }
  const holder = hex ? Object.keys(out).find((k) => k !== id && out[k] === hex) : undefined

  if (holder) {
    if (out[id]) {
      out[holder] = out[id]
    } else {
      delete out[holder]
    }
  }

  if (hex) {
    out[id] = hex
  } else {
    delete out[id]
  }

  return out
}
