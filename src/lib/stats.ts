import type { Player, Session, Text } from '../types'
import { leaders, standings } from './scoring'

export type PlayerStats = {
  id: string
  name: string
  color: string
  plays: number
  wins: number
  /** 0..1, over multiplayer games only (solo games have no winner). */
  winRate: number
  lastPlayed: number
}

export type GameStats = {
  gameId: string
  name: Text
  emoji: string
  plays: number
  lastPlayed: number
  /** Best single total ever (lowest for low-wins games). */
  record?: { total: number; name: string; at: number }
  avgWinning?: number
}

export type Overview = {
  games: number
  minutes: number
  players: number
}

export function finished(sessions: Session[]): Session[] {
  return sessions
    .filter((s) => !s.deleted && s.finishedAt)
    .sort((a, b) => b.finishedAt! - a.finishedAt!)
}

export function overview(sessions: Session[]): Overview {
  const done = finished(sessions)
  const players = new Set<string>()
  let ms = 0

  for (const s of done) {
    ms += s.finishedAt! - s.startedAt

    for (const seat of s.seats) {
      players.add(seat.id)
    }
  }

  return { games: done.length, minutes: Math.round(ms / 60000), players: players.size }
}

/** Sorted by wins, then win rate, then plays. Roster names/colours win over the snapshot. */
export function playerStats(sessions: Session[], roster: Record<string, Player>): PlayerStats[] {
  const by = new Map<string, PlayerStats & { multi: number }>()

  for (const s of finished(sessions)) {
    const won = s.seats.length > 1 ? new Set(leaders(s)) : new Set<string>()

    for (const seat of s.seats) {
      let row = by.get(seat.id)

      if (!row) {
        const p = roster[seat.id]

        row = {
          id: seat.id,
          name: p && !p.deleted ? p.name : seat.name,
          color: p && !p.deleted ? p.color : seat.color,
          plays: 0,
          wins: 0,
          winRate: 0,
          lastPlayed: s.finishedAt!,
          multi: 0,
        }
        by.set(seat.id, row)
      }

      row.plays++

      if (s.seats.length > 1) {
        row.multi++
      }

      if (won.has(seat.id)) {
        row.wins++
      }
    }
  }

  return [...by.values()]
    .map(({ multi, ...r }) => ({ ...r, winRate: multi ? r.wins / multi : 0 }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.plays - a.plays)
}

export function gameStats(sessions: Session[]): GameStats[] {
  const by = new Map<string, GameStats & { winSum: number; winCount: number }>()

  for (const s of finished(sessions)) {
    let row = by.get(s.gameId)

    if (!row) {
      row = {
        gameId: s.gameId,
        name: s.rules.name,
        emoji: s.emoji,
        plays: 0,
        lastPlayed: s.finishedAt!,
        winSum: 0,
        winCount: 0,
      }
      by.set(s.gameId, row)
    }

    row.plays++
    const table = standings(s)
    const top = table[0]

    if (!top) {
      continue
    }

    row.winSum += top.total
    row.winCount++
    const better = s.rules.lowWins
      ? !row.record || top.total < row.record.total
      : !row.record || top.total > row.record.total

    if (better) {
      row.record = { total: top.total, name: top.seat.name, at: s.finishedAt! }
    }
  }

  return [...by.values()]
    .map(({ winSum, winCount, ...r }) => ({
      ...r,
      avgWinning: winCount ? Math.round(winSum / winCount) : undefined,
    }))
    .sort((a, b) => b.plays - a.plays || b.lastPlayed - a.lastPlayed)
}

/** Head-to-head between two players across games they both played. */
export function headToHead(sessions: Session[], a: string, b: string) {
  let games = 0
  let aAhead = 0
  let bAhead = 0

  for (const s of finished(sessions)) {
    const table = standings(s)
    const ra = table.find((r) => r.seat.id === a)
    const rb = table.find((r) => r.seat.id === b)

    if (!ra || !rb) {
      continue
    }

    games++

    if (ra.rank < rb.rank) {
      aAhead++
    } else if (rb.rank < ra.rank) {
      bAhead++
    }
  }

  return { games, aAhead, bAhead, draws: games - aAhead - bAhead }
}
