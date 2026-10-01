import { useSyncExternalStore } from 'react'
import { detectLang } from '../i18n'
import type { Doc, GameDef, Player, Session, Settings } from '../types'

/**
 * Local-first store: everything lives in localStorage and the app works fully
 * offline. Cloud sync (lib/sync.ts) is an optional layer on top that ships
 * the `dirty` docs and merges remote ones with last-write-wins on updatedAt.
 */

const PREFIX = 'dice-digits:'

export type Kind = 'player' | 'game' | 'session'

export type State = {
  players: Record<string, Player>
  games: Record<string, GameDef> // custom games only; built-ins live in data/presets.ts
  sessions: Record<string, Session>
  settings: Settings
  /** `${kind}:${id}` changed locally since the last successful sync. */
  dirty: string[]
}

const COLLECTION: Record<Kind, 'players' | 'games' | 'sessions'> = {
  player: 'players',
  game: 'games',
  session: 'sessions',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)

    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage disabled: keep working in memory.
  }
}

const defaultSettings = (): Settings => ({
  lang: detectLang(),
  theme: 'auto',
  keepAwake: true,
  haptics: true,
})

function load(): State {
  return {
    players: read('players', {}),
    games: read('games', {}),
    sessions: read('sessions', {}),
    settings: { ...defaultSettings(), ...read<Partial<Settings>>('settings', {}) },
    dirty: read('dirty', []),
  }
}

let state: State = load()
const listeners = new Set<() => void>()

function set(next: Partial<State>) {
  state = { ...state, ...next }

  for (const k of Object.keys(next) as (keyof State)[]) {
    write(k, state[k])
  }

  listeners.forEach((l) => l())
}

// Another tab wrote: reload so both stay consistent.
window.addEventListener('storage', (e) => {
  if (!e.key?.startsWith(PREFIX)) {
    return
  }

  state = load()
  listeners.forEach((l) => l())
})

function subscribe(l: () => void) {
  listeners.add(l)

  return () => listeners.delete(l)
}

export const getState = () => state

/** Selectors must return something stable (a slice of state), not a fresh object. */
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

export function uid(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Plain-http LAN dev server: randomUUID needs a secure context.
  const b = crypto.getRandomValues(new Uint8Array(16))

  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function markDirty(kind: Kind, id: string): string[] {
  const tag = `${kind}:${id}`

  return state.dirty.includes(tag) ? state.dirty : [...state.dirty, tag]
}

/** In-progress games are private to this phone; only finished ones are shared. */
const shareable = (kind: Kind, doc: Doc) =>
  kind !== 'session' || Boolean((doc as Session).finishedAt)

function put<K extends Kind>(kind: K, doc: Doc) {
  const col = COLLECTION[kind]
  const prev = state[col][doc.id]?.updatedAt ?? 0
  // Strictly increasing per doc: two edits in the same millisecond must still
  // differ, or clearDirty() would mistake the second one for already sent.
  const stamped = { ...doc, updatedAt: Math.max(Date.now(), prev + 1) }

  set({
    [col]: { ...state[col], [doc.id]: stamped },
    ...(shareable(kind, stamped) ? { dirty: markDirty(kind, doc.id) } : {}),
  })
}

function remove(kind: Kind, id: string) {
  const col = COLLECTION[kind]
  const cur = state[col][id]

  if (!cur) {
    return
  }

  // Unshared drafts vanish outright; anything that may have synced leaves a tombstone.
  if (!shareable(kind, cur)) {
    const rest = { ...state[col] }

    delete rest[id]
    set({ [col]: rest })

    return
  }

  put(kind, { ...cur, deleted: true })
}

export const savePlayer = (p: Player) => put('player', p)
export const removePlayer = (id: string) => remove('player', id)
export const saveGame = (g: GameDef) => put('game', g)
export const removeGame = (id: string) => remove('game', id)
export const saveSession = (s: Session) => put('session', s)
export const removeSession = (id: string) => remove('session', id)

export function updateSession(id: string, fn: (s: Session) => Session) {
  const cur = state.sessions[id]

  if (cur) {
    saveSession(fn(cur))
  }
}

export function setSettings(patch: Partial<Settings>) {
  set({ settings: { ...state.settings, ...patch } })
}

export type RemoteDoc = { kind: Kind; id: string; updatedAt: number; data: Doc }

/** Merge docs from the server: newer updatedAt wins, nothing is marked dirty. */
export function applyRemote(docs: RemoteDoc[]) {
  if (!docs.length) {
    return 0
  }

  const next = { players: { ...state.players }, games: { ...state.games }, sessions: { ...state.sessions } }
  let changed = 0

  for (const d of docs) {
    const col = COLLECTION[d.kind]

    if (!col) {
      continue
    }

    const cur = next[col][d.id]

    if (cur && cur.updatedAt >= d.updatedAt) {
      continue

    }

    (next[col] as Record<string, Doc>)[d.id] = { ...d.data, id: d.id, updatedAt: d.updatedAt }
    changed++
  }

  if (changed) {
    set(next)
  }

  return changed
}

/** Snapshot the dirty docs for a push; `clearDirty` drops exactly those once acknowledged. */
export function dirtyDocs(): RemoteDoc[] {
  const out: RemoteDoc[] = []

  for (const tag of state.dirty) {
    const [kind, id] = tag.split(/:(.*)/s) as [Kind, string]
    const doc = state[COLLECTION[kind]]?.[id]

    if (doc) {
      out.push({ kind, id, updatedAt: doc.updatedAt, data: doc })
    }
  }

  return out
}

export function clearDirty(sent: RemoteDoc[]) {
  // A doc edited again mid-sync has a newer updatedAt than what we sent: keep it dirty.
  const done = new Set(
    sent
      .filter((d) => state[COLLECTION[d.kind]][d.id]?.updatedAt === d.updatedAt)
      .map((d) => `${d.kind}:${d.id}`),
  )

  set({ dirty: state.dirty.filter((t) => !done.has(t)) })
}

/** Mark every shareable local doc dirty — used right after joining a group. */
export function markAllDirty() {
  const tags: string[] = []

  for (const kind of Object.keys(COLLECTION) as Kind[]) {
    for (const doc of Object.values(state[COLLECTION[kind]])) {
      if (shareable(kind, doc)) {
        tags.push(`${kind}:${doc.id}`)
      }
    }
  }

  set({ dirty: tags })
}

// ---- backup ----------------------------------------------------------------

const BACKUP_FORMAT = 'dice-and-digits/1'

export function exportBackup(): string {
  const { players, games, sessions } = state

  return JSON.stringify({ format: BACKUP_FORMAT, exportedAt: Date.now(), players, games, sessions })
}

/** Returns the number of docs merged, or null when the file isn't a backup. */
export function importBackup(json: string): number | null {
  let data: Record<string, unknown>

  try {
    data = JSON.parse(json)
  } catch {
    return null
  }

  if (data?.format !== BACKUP_FORMAT) {
    return null
  }

  const docs: RemoteDoc[] = []

  const take = (kind: Kind, col: unknown) => {
    if (!col || typeof col !== 'object') {
      return
    }

    for (const d of Object.values(col as Record<string, Doc>)) {
      if (d && typeof d.id === 'string' && typeof d.updatedAt === 'number') {
        docs.push({ kind, id: d.id, updatedAt: d.updatedAt, data: d })
      }
    }
  }

  take('player', data.players)
  take('game', data.games)
  take('session', data.sessions)
  const n = applyRemote(docs)

  // Imported docs should reach the shared group too.
  set({
    dirty: [
      ...new Set([
        ...state.dirty,
        ...docs.filter((d) => shareable(d.kind, d.data)).map((d) => `${d.kind}:${d.id}`),
      ]),
    ],
  })

  return n
}
