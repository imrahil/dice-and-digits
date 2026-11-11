// @vitest-environment happy-dom
/**
 * The live-game HTTP calls against the real worker and Room, in one process
 * (the WebSocket side is covered by the worker's own tests and the e2e run).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker, { Room } from '../../worker/src/worker.js'
import { createD1 } from '../../worker/test/d1.mjs'
import { fakeNamespace } from '../../worker/test/do.mjs'
import type { Session } from '../types'

let live: typeof import('./live')
let api: typeof import('./api')
let online: boolean

const session = (id = 's1'): Session => ({
  id,
  gameId: 'builtin:catan',
  emoji: '🏝️',
  rules: { name: 'Catan', mode: 'counter', lowWins: false },
  seats: [{ id: 'anna', name: 'Anna', color: '#000' }],
  rounds: [],
  log: [],
  sheet: {},
  startedAt: 1000,
  updatedAt: 0,
})

beforeEach(async () => {
  const env = { DB: createD1(), ROOMS: fakeNamespace(Room), ALLOWED_ORIGINS: '' }

  online = true
  localStorage.clear()
  vi.stubEnv('VITE_API_URL', 'http://api.test')
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    if (!online) {
      throw new TypeError('Failed to fetch')
    }

    return worker.fetch(new Request(url, init), env)
  })
  vi.resetModules()
  live = await import('./live')
  api = await import('./api')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('live games over HTTP', () => {
  it('opens a room, remembers its handle and serves the session', async () => {
    const h = await live.startLive(session())

    expect(h.code).toMatch(/^[A-Z2-9]{6}$/)
    expect(live.liveHandle('s1')).toEqual(h)
    expect(live.liveLink(h.code)).toMatch(new RegExp(`#/live/${h.code}$`))

    const got = await live.fetchLive(h.code.toLowerCase())

    expect(got.data.session.id).toBe('s1')
    expect(got.host).toBe(false)
  })

  it('pushes the final state to the room', async () => {
    const h = await live.startLive(session())

    await live.pushLive({ ...session(), finishedAt: 5000 })

    expect((await live.fetchLive(h.code)).data.session.finishedAt).toBe(5000)
    expect(live.liveHandle('s1')).toEqual(h)
  })

  it('tells a missing game (404) from an unreachable server', async () => {
    const missing = await live.fetchLive('ZZZZZZ').catch((e) => e)

    expect(missing).toBeInstanceOf(api.ApiError)
    expect(missing.status).toBe(404)
    expect(api.isNotFound(missing)).toBe(true)

    online = false
    const offline = await live.fetchLive('ZZZZZZ').catch((e) => e)

    expect(offline).toBeInstanceOf(Error)
    expect(api.isNotFound(offline)).toBe(false)
  })

  it('forgets the handle once the room is gone, but not while offline', async () => {
    const h = await live.startLive(session())

    online = false
    await live.pushLive(session())
    expect(live.liveHandle('s1')).toEqual(h)

    online = true
    await live.stopLive('s1')
    expect(live.liveHandle('s1')).toBeUndefined()
    expect(api.isNotFound(await live.fetchLive(h.code).catch((e) => e))).toBe(true)

    // Another phone still holding the handle learns the room ended on its next push.
    localStorage.setItem('dice-digits:live', JSON.stringify({ s1: h }))
    await live.pushLive(session())
    expect(live.liveHandle('s1')).toBeUndefined()
  })
})
