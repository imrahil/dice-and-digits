// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Player, Session } from '../types'

type Store = typeof import('./store')

/** The store reads localStorage at import time, so every test gets a fresh module. */
async function freshStore(seed: Record<string, unknown> = {}): Promise<Store> {
  localStorage.clear()

  for (const [k, v] of Object.entries(seed)) {
    localStorage.setItem(`dice-digits:${k}`, JSON.stringify(v))
  }

  vi.resetModules()

  return import('./store')
}

const stored = (key: string) => JSON.parse(localStorage.getItem(`dice-digits:${key}`) ?? 'null')

const player = (id: string, name = id, updatedAt = 0): Player => ({ id, name, color: '#000', updatedAt })

function session(id: string, patch: Partial<Session> = {}): Session {
  return {
    id,
    gameId: 'builtin:counter',
    emoji: '➕',
    rules: { name: 'Counter', mode: 'counter', lowWins: false },
    seats: [{ id: 'a', name: 'A', color: '#000' }],
    rounds: [],
    log: [],
    sheet: {},
    startedAt: 0,
    updatedAt: 0,
    ...patch,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('saving', () => {
  it('stamps updatedAt, persists to localStorage and marks the doc for sync', async () => {
    const s = await freshStore()

    vi.setSystemTime(5_000)
    s.savePlayer(player('anna', 'Anna'))

    expect(s.getState().players.anna.updatedAt).toBe(5_000)
    expect(stored('players').anna.name).toBe('Anna')
    expect(s.getState().dirty).toEqual(['player:anna'])
  })

  it('marks a doc dirty only once, however often it is saved', async () => {
    const s = await freshStore()

    s.savePlayer(player('anna'))
    s.savePlayer(player('anna', 'Ania'))

    expect(s.getState().dirty).toEqual(['player:anna'])
  })

  it('keeps games in progress private: only finished sessions are marked for sync', async () => {
    const s = await freshStore()

    s.saveSession(session('live'))
    expect(s.getState().dirty).toEqual([])

    s.saveSession(session('live', { finishedAt: 2_000 }))
    expect(s.getState().dirty).toEqual(['session:live'])
  })

  it('two saves in the same millisecond still get different timestamps', async () => {
    const s = await freshStore()

    s.savePlayer(player('anna', 'v1'))
    s.savePlayer(player('anna', 'v2'))
    s.savePlayer(player('anna', 'v3'))

    expect(s.getState().players.anna.updatedAt).toBe(1_002)
  })

  it('updateSession applies a function to the latest version', async () => {
    const s = await freshStore()

    s.saveSession(session('g'))
    s.updateSession('g', (x) => ({ ...x, log: [...x.log, { p: 'a', d: 3, t: 0 }] }))
    s.updateSession('missing', () => {
      throw new Error('must not be called')
    })

    expect(s.getState().sessions.g.log).toHaveLength(1)
  })
})

describe('deleting', () => {
  it('drops an unfinished game outright (it never left the phone)', async () => {
    const s = await freshStore()

    s.saveSession(session('draft'))
    s.removeSession('draft')

    expect(s.getState().sessions.draft).toBeUndefined()
    expect(s.getState().dirty).toEqual([])
  })

  it('leaves a tombstone for anything that may have synced', async () => {
    const s = await freshStore()

    s.saveSession(session('done', { finishedAt: 2_000 }))
    s.savePlayer(player('anna'))
    s.removeSession('done')
    s.removePlayer('anna')

    expect(s.getState().sessions.done.deleted).toBe(true)
    expect(s.getState().players.anna.deleted).toBe(true)
    expect(s.getState().dirty).toEqual(['session:done', 'player:anna'])
  })

  it('ignores ids it does not know', async () => {
    const s = await freshStore()

    s.removeGame('nope')

    expect(s.getState().games).toEqual({})
  })
})

describe('applyRemote (merging what other phones synced)', () => {
  it('takes newer docs, keeps newer local ones, and does not mark them dirty', async () => {
    const s = await freshStore({ players: { anna: player('anna', 'Anna local', 500) } })

    const changed = s.applyRemote([
      { kind: 'player', id: 'anna', updatedAt: 400, data: player('anna', 'Anna older', 400) },
      { kind: 'player', id: 'bart', updatedAt: 300, data: player('bart', 'Bart', 300) },
    ])

    expect(changed).toBe(1)
    expect(s.getState().players.anna.name).toBe('Anna local')
    expect(s.getState().players.bart.name).toBe('Bart')
    expect(s.getState().dirty).toEqual([])
  })

  it('treats an equal timestamp as already seen', async () => {
    const s = await freshStore({ players: { anna: player('anna', 'Mine', 500) } })

    expect(s.applyRemote([{ kind: 'player', id: 'anna', updatedAt: 500, data: player('anna', 'Theirs', 500) }])).toBe(0)
    expect(s.getState().players.anna.name).toBe('Mine')
  })

  it('applies remote tombstones', async () => {
    const s = await freshStore({ players: { anna: player('anna', 'Anna', 100) } })

    s.applyRemote([{ kind: 'player', id: 'anna', updatedAt: 200, data: { ...player('anna', 'Anna', 200), deleted: true } }])

    expect(s.getState().players.anna.deleted).toBe(true)
  })

  it('uses the envelope id and timestamp, not whatever is inside data', async () => {
    const s = await freshStore()

    s.applyRemote([{ kind: 'player', id: 'real', updatedAt: 900, data: { ...player('spoof', 'X', 1) } }])

    expect(s.getState().players.real).toMatchObject({ id: 'real', updatedAt: 900 })
    expect(s.getState().players.spoof).toBeUndefined()
  })
})

describe('dirty tracking for sync', () => {
  it('clearDirty drops exactly what was sent, but keeps docs edited mid-sync', async () => {
    const s = await freshStore()

    vi.setSystemTime(1_000)
    s.savePlayer(player('anna'))
    s.savePlayer(player('bart'))

    const sent = s.dirtyDocs()

    expect(sent.map((d) => d.id)).toEqual(['anna', 'bart'])

    // Bart is renamed while the request is in flight.
    vi.setSystemTime(2_000)
    s.savePlayer(player('bart', 'Bartek'))
    s.clearDirty(sent)

    expect(s.getState().dirty).toEqual(['player:bart'])
  })

  it('markAllDirty (after joining a group) skips games still in progress', async () => {
    const s = await freshStore()

    s.savePlayer(player('anna'))
    s.saveSession(session('live'))
    s.saveSession(session('done', { finishedAt: 2 }))
    s.markAllDirty()

    expect(s.getState().dirty.sort()).toEqual(['player:anna', 'session:done'])
  })

  it('dirtyDocs skips tags whose doc has vanished', async () => {
    const s = await freshStore({ dirty: ['player:ghost'] })

    expect(s.dirtyDocs()).toEqual([])
  })
})

describe('backup', () => {
  it('round-trips through export and import', async () => {
    const a = await freshStore()

    a.savePlayer(player('anna', 'Anna'))
    a.saveSession(session('done', { finishedAt: 2_000 }))

    const backup = a.exportBackup()
    const b = await freshStore()

    expect(b.importBackup(backup)).toBe(2)
    expect(b.getState().players.anna.name).toBe('Anna')
    expect(b.getState().sessions.done.finishedAt).toBe(2_000)
    expect(b.getState().dirty.sort()).toEqual(['player:anna', 'session:done'])
  })

  it('never overwrites newer local data', async () => {
    const a = await freshStore()

    vi.setSystemTime(1_000)
    a.savePlayer(player('anna', 'Old'))

    const backup = a.exportBackup()
    const b = await freshStore()

    vi.setSystemTime(9_000)
    b.savePlayer(player('anna', 'New'))
    b.importBackup(backup)

    expect(b.getState().players.anna.name).toBe('New')
  })

  it('rejects files that are not a backup', async () => {
    const s = await freshStore()

    expect(s.importBackup('not json')).toBeNull()
    expect(s.importBackup(JSON.stringify({ format: 'something-else' }))).toBeNull()
    expect(s.importBackup(JSON.stringify({ format: 'dice-and-digits/1', players: { x: { id: 'x' } } }))).toBe(0)
  })
})

describe('settings and startup', () => {
  it('defaults the language from the browser and persists changes', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['pl-PL', 'en'])

    const s = await freshStore()

    expect(s.getState().settings).toMatchObject({ lang: 'pl', theme: 'auto', keepAwake: true })

    s.setSettings({ theme: 'dark' })
    expect(stored('settings').theme).toBe('dark')
  })

  it('loads what was saved before, and survives corrupt storage', async () => {
    localStorage.clear()
    localStorage.setItem('dice-digits:players', JSON.stringify({ anna: player('anna', 'Anna') }))
    localStorage.setItem('dice-digits:sessions', '{broken')
    vi.resetModules()

    const s = await import('./store')

    expect(s.getState().players.anna.name).toBe('Anna')
    expect(s.getState().sessions).toEqual({})
  })

  it('reloads when another tab writes', async () => {
    const s = await freshStore()

    localStorage.setItem('dice-digits:players', JSON.stringify({ zed: player('zed', 'Zed') }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'dice-digits:players' }))

    expect(s.getState().players.zed.name).toBe('Zed')
  })

  it('makes RFC 4122 v4 ids', async () => {
    const s = await freshStore()

    expect(s.uid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
