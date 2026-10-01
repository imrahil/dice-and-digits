import { test } from 'node:test'
import assert from 'node:assert/strict'
import worker, { LIMITS, sweepLive } from '../src/worker.js'
import { createD1 } from './d1.mjs'

const APP = 'https://imrahil.github.io'

function setup() {
  const env = { DB: createD1(), ALLOWED_ORIGINS: `${APP},http://localhost:5173` }
  const call = async (method, path, { body, token, origin = APP } = {}) => {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    if (origin) headers.Origin = origin
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

test('live scoreboard: create, view, update with token, delete', async () => {
  const { call } = setup()
  const created = await call('POST', '/api/live', { body: { data: { total: 1 } } })
  assert.equal(created.status, 201)
  const { code, token } = created.body
  assert.match(code, /^[A-Z2-9]{6}$/)

  // Anyone can view, from any origin.
  const view = await call('GET', `/api/live/${code.toLowerCase()}`, { origin: 'https://friend.example' })
  assert.equal(view.status, 200)
  assert.deepEqual(view.body.data, { total: 1 })

  assert.equal((await call('PUT', `/api/live/${code}`, { body: { data: { total: 9 } } })).status, 401)
  assert.equal((await call('PUT', `/api/live/${code}`, { token, body: { data: { total: 2 } } })).status, 200)
  assert.deepEqual((await call('GET', `/api/live/${code}`)).body.data, { total: 2 })

  assert.equal((await call('DELETE', `/api/live/${code}`, { token })).status, 200)
  assert.equal((await call('GET', `/api/live/${code}`)).status, 404)
})

test('idle live scoreboards are swept', async () => {
  const { env, call } = setup()
  const { body } = await call('POST', '/api/live', { body: { data: {} } })
  assert.equal(await sweepLive(env, Date.now() + LIMITS.liveTtlMs - 1000), 0)
  assert.equal(await sweepLive(env, Date.now() + LIMITS.liveTtlMs + 1000), 1)
  assert.equal((await call('GET', `/api/live/${body.code}`)).status, 404)
})

test('CORS preflight is answered', async () => {
  const { call } = setup()
  const res = await call('OPTIONS', '/api/sync')
  assert.equal(res.status, 204)
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), APP)
})
