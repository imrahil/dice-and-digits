// Shared game data for the preview cards: a realistic table of four, and one
// session per scoring mode, mid-game. Built-in rule snapshots mirror
// src/data/presets.ts.
import type { Scorer, Seat, Session } from 'dice-and-digits-ui'

const T0 = Date.UTC(2026, 9, 1, 18, 30)
const min = 60_000

export const seats: Seat[] = [
  { id: 'p-ola', name: 'Ola', color: '#e05a9c' },
  { id: 'p-kuba', name: 'Kuba', color: '#2e86de' },
  { id: 'p-maja', name: 'Maja', color: '#2a9d5c' },
  { id: 'p-tomek', name: 'Tomek', color: '#f07f22' },
]

const [ola, kuba, maja, tomek] = seats.map((s) => s.id)

/** Scores every seat; the boards' tap targets work but change nothing. */
export const scorer: Scorer = { canEdit: () => true, apply: () => {} }

/** A joined phone: only Kuba's own seat is editable. */
export const guestScorer: Scorer = { canEdit: (id) => id === kuba, apply: () => {} }

const base = { updatedAt: T0, startedAt: T0, rounds: [], log: [], sheet: {} }

const taps = (entries: [string, number][]) => entries.map(([p, d], i) => ({ p, d, t: T0 + (i + 1) * 3 * min }))

export const catan: Session = {
  ...base,
  id: 's-catan',
  gameId: 'builtin:catan',
  emoji: '🏝️',
  rules: { name: { en: 'Catan', pl: 'Catan' }, mode: 'counter', lowWins: false, target: 10, steps: [1, 2] },
  seats: seats.slice(0, 3),
  log: taps([[ola, 2], [kuba, 2], [maja, 2], [ola, 1], [kuba, 2], [ola, 2], [maja, 1], [kuba, 1], [ola, 1]]),
}

export const thousand: Session = {
  ...base,
  id: 's-1000',
  gameId: 'builtin:1000',
  emoji: '♠️',
  rules: { name: { en: 'Thousand (1000)', pl: 'Tysiąc' }, mode: 'rounds', lowWins: false, target: 1000 },
  seats: seats.slice(0, 3),
  rounds: [
    { [ola]: 120, [kuba]: -60, [maja]: 80 },
    { [ola]: 45, [kuba]: 210, [maja]: 0 },
    { [ola]: 100, [kuba]: 35, [maja]: 140 },
  ],
}

export const sevenWonders: Session = {
  ...base,
  id: 's-7w',
  gameId: 'builtin:7wonders',
  emoji: '🏛️',
  rules: {
    name: { en: '7 Wonders', pl: '7 Cudów Świata' },
    mode: 'sheet',
    lowWins: false,
    categories: [
      { id: 'military', name: { en: 'Military', pl: 'Konflikty militarne' } },
      { id: 'coins', name: { en: 'Treasury (coins)', pl: 'Skarbiec (monety)' }, div: 3 },
      { id: 'wonder', name: { en: 'Wonder', pl: 'Cud' } },
      { id: 'civil', name: { en: 'Civilian (blue)', pl: 'Budynki cywilne (niebieskie)' } },
      { id: 'science', name: { en: 'Science (green)', pl: 'Nauka (zielone)' } },
    ],
  },
  seats: seats.slice(0, 3),
  sheet: {
    military: { [ola]: 9, [kuba]: -2, [maja]: 4 },
    coins: { [ola]: 7, [kuba]: 14, [maja]: 4 },
    wonder: { [ola]: 10, [kuba]: 7 },
    civil: { [ola]: 12 },
  },
}

export const kittens: Session = {
  ...base,
  id: 's-ek',
  gameId: 'builtin:exploding-kittens',
  emoji: '💣',
  rules: { name: { en: 'Exploding Kittens', pl: 'Eksplodujące kotki' }, mode: 'winner', lowWins: false },
  seats,
  rounds: [{ [maja]: 1 }, { [ola]: 1 }, { [maja]: 1 }, { [tomek]: 1 }, { [maja]: 1 }],
}

/** Catan for four laid out as tiles (the grid view); Ola is one point from winning. */
export const catanGrid: Session = {
  ...catan,
  id: 's-catan-grid',
  counterView: 'grid',
  seats,
  log: taps([[ola, 2], [kuba, 2], [maja, 2], [tomek, 2], [ola, 2], [kuba, 2], [maja, 1], [ola, 2], [tomek, 1], [ola, 3]]),
}

/** The same game in table mode: the phone lies between the players. */
export const catanTable: Session = { ...catanGrid, id: 's-catan-table', counterView: 'table' }

/** Thousand, shared live from this phone (pass `live` to ActiveGameCard). */
export const thousandLive: Session = { ...thousand, id: 's-1000-live' }

/** Finished: Ola won Catan 40 minutes after the start. */
export const catanFinished: Session = { ...catan, id: 's-catan-done', finishedAt: T0 + 40 * min, log: [...catan.log, { p: ola, d: 2, t: T0 + 39 * min }] }

/** Finished in a three-way tie at the top. */
export const thousandTied: Session = {
  ...thousand,
  id: 's-1000-tie',
  finishedAt: T0 + 75 * min,
  rounds: [{ [ola]: 200, [kuba]: 200, [maja]: 200 }],
}
