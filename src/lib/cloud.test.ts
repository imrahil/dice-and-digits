// @vitest-environment happy-dom
/**
 * Group sync, end to end in one process: lib/cloud.ts on several "phones"
 * talks to the real worker (worker/src/worker.js) running on real SQL
 * (node:sqlite standing in for D1). Each phone has its own localStorage,
 * swapped in before its turn.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker, { LIMITS, Room } from '../../worker/src/worker.js'
import { createD1 } from '../../worker/test/d1.mjs'
import { fakeNamespace } from '../../worker/test/do.mjs'
import type { Player, Session } from '../types'
import { codeWords, parseWords } from './recovery'

const API = 'http://api.test'

type Phone = { store: typeof import('./store'); cloud: typeof import('./cloud') }

let env: Record<string, unknown>
let requests: number
let beforeServer: (() => void) | null
const disks: Record<string, Record<string, string>> = {}

beforeEach(() => {
  env = { DB: createD1(), ROOMS: fakeNamespace(Room), ALLOWED_ORIGINS: '' }
  requests = 0
  beforeServer = null

  for (const k of Object.keys(disks)) {
    delete disks[k]
  }

  vi.stubEnv('VITE_API_URL', API)
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    requests++
    beforeServer?.()

    return worker.fetch(new Request(url, init), env)
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

/** Run `fn` as phone `name`: its own localStorage and fresh modules. */
async function onPhone<T>(name: string, fn: (p: Phone) => Promise<T> | T): Promise<T> {
  localStorage.clear()

  for (const [k, v] of Object.entries(disks[name] ?? {})) {
    localStorage.setItem(k, v)
  }

  vi.resetModules()

  const phone = { store: await import('./store'), cloud: await import('./cloud') }
  const out = await fn(phone)
  const disk: Record<string, string> = {}

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!

    disk[k] = localStorage.getItem(k)!
  }

  disks[name] = disk

  return out
}

const player = (id: string, name = id): Player => ({ id, name, color: '#000', updatedAt: 0 })

const finished = (id: string): Session => ({
  id,
  gameId: 'builtin:catan',
  emoji: '🏝️',
  rules: { name: 'Catan', mode: 'counter', lowWins: false },
  seats: [{ id: 'anna', name: 'Anna', color: '#000' }],
  rounds: [],
  log: [{ p: 'anna', d: 10, t: 1 }],
  sheet: {},
  startedAt: 1,
  finishedAt: 2,
  updatedAt: 0,
})

/** Create a group on phone A and join it from B; returns the invite token. */
async function pairPhones() {
  const token = await onPhone('A', async ({ cloud }) => {
    await cloud.createGroup('Friday crew')

    const g = cloud.getCloud().group!

    return `${g.id}.${g.secret}`
  })

  await onPhone('B', ({ cloud }) => cloud.joinGroup(token))

  return token
}

describe('groups', () => {
  it('a new group uploads what the phone already had; a joining phone downloads it', async () => {
    await onPhone('A', ({ store }) => {
      store.savePlayer(player('anna', 'Anna'))
      store.saveSession(finished('g1'))
    })
    await pairPhones()

    await onPhone('B', ({ store, cloud }) => {
      expect(store.getState().players.anna.name).toBe('Anna')
      expect(store.getState().sessions.g1.finishedAt).toBe(2)
      expect(cloud.getCloud().group?.name).toBe('Friday crew')
      expect(cloud.getCloud().error).toBeNull()
    })
  })

  it('the joining phone shares its own data back', async () => {
    await onPhone('B', ({ store }) => store.savePlayer(player('bart', 'Bart')))
    await pairPhones()

    await onPhone('A', async ({ store, cloud }) => {
      await cloud.syncNow()
      expect(store.getState().players.bart.name).toBe('Bart')
    })
  })

  it('games still in progress never leave the phone', async () => {
    await onPhone('A', ({ store }) => store.saveSession({ ...finished('live'), finishedAt: undefined }))
    await pairPhones()

    await onPhone('B', ({ store }) => expect(store.getState().sessions.live).toBeUndefined())
  })

  it('an invalid invite is rejected and leaves the phone ungrouped', async () => {
    await onPhone('B', async ({ cloud }) => {
      await expect(cloud.joinGroup('00000000-0000-4000-8000-000000000000.nope')).rejects.toThrow()
      expect(cloud.getCloud().group).toBeNull()
    })
  })

  it('after leaving, syncNow does nothing', async () => {
    await pairPhones()
    await onPhone('B', async ({ store, cloud }) => {
      cloud.leaveGroup()
      store.savePlayer(player('zed'))

      const before = requests

      await cloud.syncNow()
      expect(requests).toBe(before)
    })
  })

  it('the invite link carries the group token in the hash', async () => {
    const token = await pairPhones()

    await onPhone('A', ({ cloud }) => {
      expect(cloud.inviteLink(cloud.getCloud().group!)).toMatch(new RegExp(`#/join/${token.replace('.', '\\.')}$`))
    })
  })
})

describe('personal backup', () => {
  /** Back up phone A; returns its recovery words in English, as shown to the user. */
  const backUp = () =>
    onPhone('A', async ({ cloud }) => {
      await cloud.createBackup('My backup')

      return codeWords(cloud.getCloud().group!.code!, 'en')
    })

  /** What the restore screen does with typed words. */
  const restore = async (cloud: Phone['cloud'], typed: string) => {
    const parsed = parseWords(typed)

    if (!('code' in parsed)) {
      throw new Error(JSON.stringify(parsed))
    }

    await cloud.joinGroup(await cloud.backupToken(parsed.code), parsed.code)
  }

  it('a phone restores everything from the six words alone, typed in Polish', async () => {
    await onPhone('A', ({ store }) => {
      store.savePlayer(player('anna', 'Anna'))
      store.saveGame({ id: 'mine', name: 'Mine', emoji: '🎲', mode: 'counter', lowWins: false, updatedAt: 1 })
      store.saveSession(finished('g1'))
      store.saveSession({ ...finished('live'), finishedAt: undefined })
    })

    const words = await backUp()
    const code = await onPhone('A', ({ cloud }) => cloud.getCloud().group!.code!)

    await onPhone('B', async ({ store, cloud }) => {
      await restore(cloud, codeWords(code, 'pl').join(' ').toUpperCase())
      expect(store.getState().players.anna.name).toBe('Anna')
      expect(store.getState().games.mine.name).toBe('Mine')
      expect(store.getState().sessions.g1.finishedAt).toBe(2)
      expect(store.getState().sessions.live).toBeUndefined()
      expect(cloud.getCloud().group).toMatchObject({ kind: 'vault', name: 'My backup', code })
      expect(cloud.getCloud().group!.savedAt).toBeTypeOf('number')
    })
    expect(words).toHaveLength(6)
  })

  it('the server never sees the words or the code', async () => {
    const bodies: string[] = []

    beforeServer = null
    vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
      bodies.push(String(init.body ?? '') + JSON.stringify(init.headers ?? {}) + url)

      return worker.fetch(new Request(url, init), env)
    })

    const words = await backUp()
    const code = await onPhone('A', ({ cloud }) => cloud.getCloud().group!.code!)
    const sent = bodies.join('\n')

    expect(sent).not.toContain(code)

    for (const w of [...words, ...codeWords(code, 'pl')]) {
      expect(sent).not.toMatch(new RegExp(`\\b${w}\\b`))
    }
  })

  it('a wiped phone comes back, and data on the new phone joins the backup', async () => {
    const words = (await backUp()).join(' ')

    await onPhone('A', ({ store }) => store.savePlayer(player('anna', 'Anna')))
    await onPhone('A', ({ cloud }) => cloud.syncNow())
    delete disks.A // browser data cleared

    await onPhone('A', async ({ store, cloud }) => {
      store.savePlayer(player('bart', 'Bart')) // added before restoring
      await restore(cloud, words)
      expect(Object.keys(store.getState().players).sort()).toEqual(['anna', 'bart'])
    })
    await onPhone('C', async ({ store, cloud }) => {
      await restore(cloud, words)
      expect(Object.keys(store.getState().players).sort()).toEqual(['anna', 'bart'])
    })
  })

  it('the recovery link carries the code, never the key; unknown words open nothing', async () => {
    await backUp()

    const [link, group] = await onPhone('A', ({ cloud }) => [cloud.inviteLink(cloud.getCloud().group!), cloud.getCloud().group!] as const)

    expect(link).toMatch(new RegExp(`#/join/${group.code}$`))
    expect(link).not.toContain(group.secret)

    await onPhone('B', async ({ cloud }) => {
      await expect(restore(cloud, 'cat cat cat cat cat cat')).rejects.toThrow()
      expect(cloud.getCloud().group).toBeNull()
    })
  })

  it('a new backup asks for its words to be saved, until confirmed', async () => {
    await backUp()
    await onPhone('A', ({ cloud }) => {
      expect(cloud.getCloud().group!.savedAt).toBeUndefined()
      cloud.markCodeSaved()
      expect(cloud.getCloud().group!.savedAt).toBeTypeOf('number')
    })
    await onPhone('A', ({ cloud }) => expect(cloud.getCloud().group!.savedAt).toBeTypeOf('number'))
  })

  it('deleting the backup removes it for every phone; this phone keeps its data', async () => {
    const words = (await backUp()).join(' ')

    await onPhone('A', async ({ store, cloud }) => {
      store.savePlayer(player('anna'))
      await cloud.syncNow()
      await cloud.deleteBackup()
      expect(cloud.getCloud().group).toBeNull()
      expect(store.getState().players.anna).toBeDefined()
    })
    await onPhone('B', async ({ cloud }) => {
      await expect(restore(cloud, words)).rejects.toThrow()
    })
  })

  it('leaving while a sync is in flight is not undone by its answer', async () => {
    await backUp()
    await onPhone('A', async ({ store, cloud }) => {
      store.savePlayer(player('anna'))

      beforeServer = () => {
        beforeServer = null
        cloud.leaveGroup()
      }

      await cloud.syncNow()
      expect(cloud.getCloud().group).toBeNull()
    })
  })
})

describe('sync', () => {
  it('last edit wins across phones, whichever syncs first', async () => {
    await onPhone('A', ({ store }) => store.savePlayer(player('anna', 'Anna')))
    await pairPhones()

    const now = Date.now()

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now + 20_000)
    await onPhone('A', ({ store }) => store.savePlayer(player('anna', 'Ania (A, later)')))
    vi.setSystemTime(now + 10_000)
    await onPhone('B', ({ store }) => store.savePlayer(player('anna', 'Anka (B, earlier)')))
    vi.useRealTimers()

    // The later edit syncs first, the earlier one second: the later must still win.
    await onPhone('A', ({ cloud }) => cloud.syncNow())
    await onPhone('B', ({ cloud }) => cloud.syncNow())
    await onPhone('A', ({ cloud }) => cloud.syncNow())

    for (const p of ['A', 'B']) {
      await onPhone(p, ({ store }) => expect(store.getState().players.anna.name).toBe('Ania (A, later)'))
    }
  })

  it('an edit made after seeing a version beats it, even on a phone whose clock is behind', async () => {
    await onPhone('A', ({ store }) => store.savePlayer(player('anna', 'Anna')))
    await pairPhones()

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() - 3_600_000) // B's clock is an hour slow
    await onPhone('B', async ({ store, cloud }) => {
      store.savePlayer({ ...store.getState().players.anna, name: 'Renamed on B' })
      await cloud.syncNow()
    })
    vi.useRealTimers()

    await onPhone('A', async ({ store, cloud }) => {
      await cloud.syncNow()
      expect(store.getState().players.anna.name).toBe('Renamed on B')
    })
  })

  it('a slow-clock phone that missed a newer edit catches up instead of keeping its own', async () => {
    await onPhone('A', ({ store }) => store.savePlayer(player('anna', 'Anna')))
    await pairPhones()

    // A renames and syncs; B, an hour slow and not yet synced, renames too.
    await onPhone('A', async ({ store, cloud }) => {
      store.savePlayer({ ...store.getState().players.anna, name: 'From A' })
      await cloud.syncNow()
    })
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() - 3_600_000)
    await onPhone('B', ({ store }) => store.savePlayer({ ...store.getState().players.anna, name: 'From slow B' }))
    vi.useRealTimers()

    await onPhone('B', async ({ store, cloud }) => {
      await cloud.syncNow()
      expect(store.getState().players.anna.name).toBe('From A')
      expect(store.getState().dirty).toEqual([])
    })
  })

  it('deletions travel as tombstones', async () => {
    await onPhone('A', ({ store }) => store.saveSession(finished('g1')))
    await pairPhones()
    await onPhone('A', async ({ store, cloud }) => {
      store.removeSession('g1')
      await cloud.syncNow()
    })

    await onPhone('B', async ({ store, cloud }) => {
      await cloud.syncNow()
      expect(store.getState().sessions.g1.deleted).toBe(true)
    })
  })

  it('pushes more than one batch and pulls more than one page', async () => {
    const n = LIMITS.docsPerPush * 2 + 50 // 450 docs: three pushes, and the pull spans pages of 500

    await onPhone('A', ({ store }) => {
      for (let i = 0; i < n; i++) {
        store.savePlayer(player(`p${i}`))
      }
    })
    await pairPhones()

    await onPhone('A', ({ store }) => expect(store.getState().dirty).toEqual([]))
    await onPhone('C', async ({ store, cloud }) => {
      const a = disks.A['dice-digits:group']
      const g = JSON.parse(a)

      await cloud.joinGroup(`${g.id}.${g.secret}`)
      expect(Object.keys(store.getState().players)).toHaveLength(n)
    })
  })

  it('a doc edited while its sync is in flight is sent again next time', async () => {
    await pairPhones()
    await onPhone('A', async ({ store, cloud }) => {
      store.savePlayer(player('anna', 'v1'))

      // Rename Anna right as the request reaches the server.
      beforeServer = () => {
        beforeServer = null
        store.savePlayer({ ...store.getState().players.anna, name: 'v2' })
      }

      await cloud.syncNow()
      expect(store.getState().dirty).toEqual(['player:anna'])

      await cloud.syncNow()
      expect(store.getState().dirty).toEqual([])
    })

    await onPhone('B', async ({ store, cloud }) => {
      await cloud.syncNow()
      expect(store.getState().players.anna.name).toBe('v2')
    })
  })

  it('concurrent syncNow calls share one run', async () => {
    await pairPhones()
    await onPhone('A', async ({ store, cloud }) => {
      store.savePlayer(player('anna'))

      const before = requests

      await Promise.all([cloud.syncNow(), cloud.syncNow(), cloud.syncNow()])
      expect(requests - before).toBe(1)
    })
  })

  it('a failed sync keeps local changes and reports the error', async () => {
    await pairPhones()
    await onPhone('A', async ({ store, cloud }) => {
      store.savePlayer(player('anna'))
      vi.stubGlobal('fetch', async () => {
        throw new TypeError('Failed to fetch')
      })

      await cloud.syncNow()

      expect(cloud.getCloud()).toMatchObject({ syncing: false, error: 'Failed to fetch' })
      expect(store.getState().dirty).toEqual(['player:anna'])
    })
  })

  it('server errors surface their message', async () => {
    await pairPhones()
    env.DB = createD1() // the server "lost" the group: auth now fails

    await onPhone('A', async ({ store, cloud }) => {
      store.savePlayer(player('anna'))
      await cloud.syncNow()
      expect(cloud.getCloud().error).toBe('Unknown group')
    })
  })
})
