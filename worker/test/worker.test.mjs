import { test } from 'node:test'
import assert from 'node:assert/strict'
import worker, { LIMITS, Room } from '../src/worker.js'
import { sha256 } from '../src/crypto.js'
import { createD1 } from './d1.mjs'
import { fakeNamespace } from './do.mjs'

const APP = 'https://imrahil.github.io'

function setup() {
  const env = { DB: createD1(), ROOMS: fakeNamespace(Room), ALLOWED_ORIGINS: `${APP},http://localhost:5173` }

  const call = async (method, path, { body, token, origin = APP } = {}) => {
    const headers = { 'Content-Type': 'application/json' }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    if (origin) {
      headers.Origin = origin
    }

    const res = await worker.fetch(
      new Request(`https://api.test${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      env,
    )

    return { status: res.status, body: await res.json().catch(() => null), headers: res.headers }
  }

  return { env, call }
}

async function newGroup(call, name = 'Friday crew') {
  const { status, body } = await call('POST', '/api/groups', { body: { name } })

  assert.equal(status, 201)

  return `${body.id}.${body.secret}`
}

const doc = (id, updatedAt, extra = {}) => ({
  kind: 'player',
  id,
  updatedAt,
  data: { id, name: `P-${id}`, updatedAt, ...extra },
})

test('creating a group stores only the secret hash', async () => {
  const { env, call } = setup()
  const token = await newGroup(call)
  const [id, secret] = token.split('.')
  const row = env.DB.raw.prepare('SELECT * FROM groups WHERE id = ?').get(id)

  assert.equal(row.name, 'Friday crew')
  assert.notEqual(row.secret_hash, secret)
  assert.equal(row.secret_hash.length, 64)
})

test('group name is required and trimmed to the limit', async () => {
  const { call } = setup()

  assert.equal((await call('POST', '/api/groups', { body: { name: '  ' } })).status, 400)
  const { body } = await call('POST', '/api/groups', { body: { name: 'x'.repeat(200) } })

  assert.equal(body.name.length, LIMITS.nameLength)
})

test('sync rejects a wrong secret', async () => {
  const { call } = setup()
  const token = await newGroup(call)
  const id = token.split('.')[0]
  const res = await call('POST', '/api/sync', { token: `${id}.nope`, body: { cursor: 0, docs: [] } })

  assert.equal(res.status, 401)
  assert.equal((await call('POST', '/api/sync', { body: {} })).status, 401)
})

test('writes from a foreign origin are refused', async () => {
  const { call } = setup()
  const res = await call('POST', '/api/groups', { body: { name: 'x' }, origin: 'https://evil.example' })

  assert.equal(res.status, 403)
})

const hex = (bytes) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('')

/** A backup as the phone creates it: id and secret derived from its words, here just random. */
async function newVault(call) {
  const id = hex(16)
  const secret = hex(32)
  const res = await call('POST', '/api/groups', { body: { name: 'Me', kind: 'vault', id, secret } })

  return { res, id, secret, token: `${id}.${secret}` }
}

test('a personal backup takes its id and secret from the phone; only the hash is stored', async () => {
  const { env, call } = setup()
  const { res, id, secret, token } = await newVault(call)

  assert.equal(res.status, 201)
  assert.deepEqual(res.body, { id, name: 'Me', kind: 'vault' }) // the secret is never echoed

  const row = env.DB.raw.prepare('SELECT * FROM groups WHERE id = ?').get(id)

  assert.equal(row.kind, 'vault')
  assert.equal(row.secret_hash, await sha256(secret))
  assert.deepEqual((await call('GET', '/api/groups/me', { token })).body, { id, name: 'Me', kind: 'vault' })

  const synced = await call('POST', '/api/sync', { token, body: { cursor: 0, docs: [doc('anna', 1)] } })

  assert.equal(synced.body.group.kind, 'vault')
  assert.equal(synced.body.docs.length, 1)
})

test('a backup id is never taken over, and must look derived', async () => {
  const { call } = setup()
  const { id } = await newVault(call)
  const again = await call('POST', '/api/groups', { body: { name: 'Thief', kind: 'vault', id, secret: hex(32) } })

  assert.equal(again.status, 409)

  for (const body of [{}, { id: 'short', secret: hex(32) }, { id: hex(16), secret: 'weak' }]) {
    assert.equal((await call('POST', '/api/groups', { body: { name: 'Me', kind: 'vault', ...body } })).status, 400)
  }
})

test('a plain group is still a group, whatever kind is asked for', async () => {
  const { call } = setup()
  const { body } = await call('POST', '/api/groups', { body: { name: 'Crew', kind: 'admin' } })

  assert.equal(body.kind, 'group')
})

test('deleting a personal backup removes its docs; shared groups cannot be deleted', async () => {
  const { env, call } = setup()
  const { id, token } = await newVault(call)

  await call('POST', '/api/sync', { token, body: { cursor: 0, docs: [doc('anna', 1)] } })

  assert.equal((await call('DELETE', '/api/groups/me', { token: `${id}.${hex(32)}` })).status, 401)
  assert.equal((await call('DELETE', '/api/groups/me', { token, origin: 'https://evil.example' })).status, 403)
  assert.equal((await call('DELETE', '/api/groups/me', { token })).status, 200)
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM docs WHERE group_id = ?').get(id).n, 0)
  assert.equal((await call('GET', '/api/groups/me', { token })).status, 401)

  const shared = await newGroup(call)

  assert.equal((await call('DELETE', '/api/groups/me', { token: shared })).status, 403)
})

test('two phones converge through sync', async () => {
  const { call } = setup()
  const token = await newGroup(call)

  const a = await call('POST', '/api/sync', { token, body: { cursor: 0, docs: [doc('anna', 100)] } })

  assert.equal(a.status, 200)
  assert.equal(a.body.docs.length, 1)

  const b = await call('POST', '/api/sync', { token, body: { cursor: 0, docs: [doc('bart', 200)] } })

  assert.deepEqual(b.body.docs.map((d) => d.id).sort(), ['anna', 'bart'])

  // Phone A pulls from its cursor and gets only what it hasn't seen.
  const a2 = await call('POST', '/api/sync', { token, body: { cursor: a.body.cursor, docs: [] } })

  assert.deepEqual(a2.body.docs.map((d) => d.id), ['bart'])
  assert.equal(a2.body.cursor, b.body.cursor)
})

test('last write wins: an older edit never overwrites a newer one', async () => {
  const { call } = setup()
  const token = await newGroup(call)

  await call('POST', '/api/sync', { token, body: { cursor: 0, docs: [doc('anna', 500, { name: 'Anna new' })] } })
  const stale = await call('POST', '/api/sync', {
    token,
    body: { cursor: 0, docs: [doc('anna', 300, { name: 'Anna old' })] },
  })

  assert.equal(stale.body.docs[0].data.name, 'Anna new')
  assert.equal(stale.body.docs[0].updatedAt, 500)
})

test('a phone with a slow clock gets the newer server version back', async () => {
  const { call } = setup()
  const token = await newGroup(call)
  const a = await call('POST', '/api/sync', { token, body: { cursor: 0, docs: [doc('anna', 500, { name: 'New' })] } })
  // Phone B is already up to date (cursor past anna) and pushes an older edit.
  const b = await call('POST', '/api/sync', { token, body: { cursor: a.body.cursor, docs: [doc('anna', 300, { name: 'Old' })] } })

  assert.deepEqual(b.body.docs.map((d) => [d.id, d.data.name, d.updatedAt]), [['anna', 'New', 500]])
  assert.equal(b.body.cursor, a.body.cursor, 'the cursor is not moved by returned winners')
})

test('groups are isolated from each other', async () => {
  const { call } = setup()
  const g1 = await newGroup(call, 'one')
  const g2 = await newGroup(call, 'two')

  await call('POST', '/api/sync', { token: g1, body: { cursor: 0, docs: [doc('secret-player', 1)] } })
  const other = await call('POST', '/api/sync', { token: g2, body: { cursor: 0, docs: [] } })

  assert.equal(other.body.docs.length, 0)
})

test('invalid docs are rejected', async () => {
  const { call } = setup()
  const token = await newGroup(call)
  const bad = [
    { ...doc('x', 1), kind: 'hack' },
    { ...doc('x', 1), id: 'has space' },
    { ...doc('x', 1), updatedAt: 'soon' },
    { ...doc('x', 1), data: null },
  ]

  for (const d of bad) {
    const res = await call('POST', '/api/sync', { token, body: { cursor: 0, docs: [d] } })

    assert.equal(res.status, 400, JSON.stringify(d))
  }

  const big = doc('big', 1, { blob: 'x'.repeat(LIMITS.docBytes) })

  assert.equal((await call('POST', '/api/sync', { token, body: { docs: [big] } })).status, 413)
})

test('paging never splits a rev, so no doc is skipped', async () => {
  const { call } = setup()
  const token = await newGroup(call)

  // 3 pushes of 200 = 600 docs over 3 revs, page size 500.
  for (let p = 0; p < 3; p++) {
    const docs = Array.from({ length: LIMITS.docsPerPush }, (_, i) => doc(`p${p}-${i}`, 1))
    const r = await call('POST', '/api/sync', { token, body: { cursor: 0, docs } })

    assert.equal(r.status, 200)
  }

  const seen = new Set()
  let cursor = 0
  let more = true
  let pages = 0

  while (more) {
    const r = await call('POST', '/api/sync', { token, body: { cursor, docs: [] } })

    r.body.docs.forEach((d) => seen.add(d.id))
    assert.ok(r.body.docs.length <= LIMITS.pageSize)
    cursor = r.body.cursor
    more = r.body.more
    pages++
  }

  assert.equal(seen.size, 600)
  assert.equal(pages, 2)
})

const live = (total) => ({ data: { session: { id: 's', seats: [], total } } })

test('live game: create, view, update with token, delete', async () => {
  const { call } = setup()
  const created = await call('POST', '/api/live', { body: live(1) })

  assert.equal(created.status, 201)
  const { code, token } = created.body

  assert.match(code, /^[A-Z2-9]{6}$/)

  // Anyone can view, from any origin.
  const view = await call('GET', `/api/live/${code.toLowerCase()}`, { origin: 'https://friend.example' })

  assert.equal(view.status, 200)
  assert.equal(view.body.data.session.total, 1)
  assert.equal(view.body.host, false)

  assert.equal((await call('PUT', `/api/live/${code}`, { body: live(9) })).status, 401)
  assert.equal((await call('PUT', `/api/live/${code}`, { token, body: live(2) })).status, 200)
  assert.equal((await call('GET', `/api/live/${code}`)).body.data.session.total, 2)

  assert.equal((await call('DELETE', `/api/live/${code}`, { token })).status, 200)
  assert.equal((await call('GET', `/api/live/${code}`)).status, 404)
})

test('live game: malformed payloads and unknown codes', async () => {
  const { call } = setup()

  assert.equal((await call('POST', '/api/live', { body: { data: {} } })).status, 400)
  const big = { data: { session: { seats: [], blob: 'x'.repeat(LIMITS.liveBytes) } } }

  assert.equal((await call('POST', '/api/live', { body: big })).status, 413)
  assert.equal((await call('GET', '/api/live/ZZZZZZ')).status, 404)
  assert.equal((await call('GET', '/api/live/../../x')).status, 404)
})

test('the WebSocket route requires an upgrade and an allowed origin', async () => {
  const { call } = setup()
  const { body } = await call('POST', '/api/live', { body: live(0) })

  assert.equal((await call('GET', `/api/live/${body.code}/ws`)).status, 426)
})

test('CORS preflight is answered', async () => {
  const { call } = setup()
  const res = await call('OPTIONS', '/api/sync')

  assert.equal(res.status, 204)
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), APP)
})
