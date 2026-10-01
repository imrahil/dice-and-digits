export type Lang = 'en' | 'pl'

/** User-entered text is a plain string; built-in presets carry both languages. */
export type Text = string | { en: string; pl: string }

/**
 * - counter: big +/- buttons per player, every tap is logged (Catan, Carcassonne)
 * - rounds:  a row of scores per round, running totals (Uno, Tysiąc, Rummy)
 * - sheet:   end-of-game score pad, one row per category (7 Wonders, Wingspan)
 * - winner:  no points, just who won each round (Exploding Kittens); with
 *            lowWins it records who *lost* instead (Hot Potato)
 */
export type ScoringMode = 'counter' | 'rounds' | 'sheet' | 'winner'

export type Category = {
  id: string
  name: Text
  /** Entered as a positive number, counted as minus (e.g. failed tickets). */
  negative?: boolean
  /** What you enter is a count worth `per` points each (3 upgrades × 2). */
  per?: number
  /** What you enter is divided, rounded down (7 Wonders: 1 point per 3 coins). */
  div?: number
}

/** "Score at least `atLeast` across `of` → +`points`" (Yahtzee upper section). */
export type Bonus = {
  name: Text
  of: string[]
  atLeast: number
  points: number
}

/** Everything a session needs to score itself — snapshotted into the session at start. */
export type Rules = {
  name: Text
  mode: ScoringMode
  lowWins: boolean
  /** Reaching this total ends the game (suggests finishing). */
  target?: number
  categories?: Category[]
  bonus?: Bonus
  /** Quick-add buttons for counter mode. */
  steps?: number[]
  /**
   * Rounds mode: one player per round takes the sum of everyone else's minus
   * points (Rummikub). Adds a "winner takes the rest" button to round entry.
   */
  zeroSum?: boolean
}

/** Fields every synced document carries (last-write-wins on updatedAt). */
export type Doc = {
  id: string
  updatedAt: number
  deleted?: boolean
}

export type Player = Doc & {
  name: string
  color: string
}

export type GameDef = Doc &
  Rules & {
    emoji: string
    builtin?: boolean
  }

export type Seat = {
  id: string // player id
  name: string
  color: string
}

export type LogEntry = {
  p: string // player id
  d: number // delta
  t: number // timestamp
}

export type Session = Doc & {
  gameId: string
  emoji: string
  rules: Rules
  seats: Seat[]
  rounds: Record<string, number>[]
  log: LogEntry[]
  sheet: Record<string, Record<string, number>>
  startedAt: number
  finishedAt?: number
  /** Player id picked as winner when the top score is tied. */
  tieBreak?: string
  notes?: string
  /** Ids of the most recent ops applied from joined phones (dedupes resends). */
  ops?: string[]
}

export type Standing = {
  seat: Seat
  total: number
  rank: number // 1-based, ties share a rank (1, 1, 3)
}

export type Theme = 'auto' | 'light' | 'dark'

/** Visual skin; each one is a block of CSS variables in src/index.css. */
export type Skin = 'arcade' | 'bubble' | 'classic'

export type Settings = {
  lang: Lang
  theme: Theme
  skin: Skin
  keepAwake: boolean
  haptics: boolean
}
