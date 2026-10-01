import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Room, ROOM_LIMITS, validOp } from '../src/room.js'
import { sha256 } from '../src/crypto.js'
import { FakeCtx, FakeWS } from './do.mjs'

const HOST = 'host-token'
const session = () => ({
  id: 's1',
  seats: [
    { id: 'anna', name: 'Anna', color: '#e4572e' },
    { id: 'bart', name: 'Bart', color: '#2e86de' },
  ],
  log: [],
})

async function setup() {
  const room = new Room(new FakeCtx(), {})
  assert.equal(await room.init(await sha256(HOST), session()), true)
  const join = async (hello) => {
    const ws = new FakeWS()
    room.connect(ws)
    await room.webSocketMessage(ws, JSON.stringify({ t: 'hello', ...hello }))
    return ws
  }
  const say = (ws, msg) => room.webSocketMessage(ws, JSON.stringify(msg))
  return { room, join, say }
}

const op = (id, p, extra = { kind: 'add', d: 3 }) => ({ id, p, ...extra })

test('a code cannot be initialised twice', async () => {
  const { room } = await setup()
  assert.equal(await room.init('x', session()), false)
})

test('hello: host needs the right token, everyone gets the state', async () => {
  const { join } = await setup()
  const bad = await join({ host: 'nope' })
  assert.equal(bad.last('error').code, 'not-host')

  const host = await join({ host: HOST })
  assert.equal(host.last('welcome').role, 'host')
  assert.equal(host.last('state').session.id, 's1')

  const guest = await join({})
  assert.equal(guest.last('welcome').role, 'guest')
  assert.equal(guest.last('room').host, true)
  assert.equal(guest.last('room').guests, 1)
})

test('messages before hello are refused', async () => {
  const { room, say } = await setup()
  const ws = new FakeWS()
  room.connect(ws)
  await say(ws, { t: 'claim', seat: 'anna' })
  assert.equal(ws.last('error').code, 'hello-first')
})

test('claiming seats: one guest per seat, one seat per guest, resumable by token', async () => {
  const { join, say } = await setup()
  const g1 = await join({})
  await say(g1, { t: 'claim', seat: 'anna' })
  const { guest: token } = g1.last('claimed')
  assert.ok(token)

  const g2 = await join({})
  await say(g2, { t: 'claim', seat: 'anna' })
  assert.equal(g2.last('error').code, 'taken')
  await say(g2, { t: 'claim', seat: 'ghost' })
  assert.equal(g2.last('error').code, 'no-seat')

  // Moving seats frees the old one.
  await say(g1, { t: 'claim', seat: 'bart' })
  assert.deepEqual(g1.last('room').seats, { bart: true })

  // A new socket with the same token gets the seat back.
  const again = await join({ guest: token })
  assert.equal(again.last('welcome').seat, 'bart')
})

test('guest ops are validated, queued and relayed to the host', async () => {
  const { join, say, room } = await setup()
  const guest = await join({})
  await say(guest, { t: 'op', op: op('o1', 'anna') })
  assert.equal(guest.last('error').code, 'no-seat')

  await say(guest, { t: 'claim', seat: 'anna' })
  await say(guest, { t: 'op', op: op('o2', 'bart') })
  assert.equal(guest.last('error').code, 'bad-op', 'cannot score for someone else')

  // Host offline: the op waits in the queue.
  await say(guest, { t: 'op', op: op('o3', 'anna') })
  await say(guest, { t: 'op', op: op('o3', 'anna') }) // resend is de-duplicated
  assert.equal((await room.ctx.storage.get('pending')).length, 1)

  // Host connects and receives the backlog.
  const host = await join({ host: HOST })
  assert.deepEqual(host.last('ops').ops.map((o) => o.id), ['o3'])

  // Live relay while the host is connected.
  await say(guest, { t: 'op', op: op('o4', 'anna', { kind: 'cell', cat: 'science', v: 12 }) })
  assert.deepEqual(host.last('ops').ops.map((o) => o.id), ['o4'])
})

test('host ack clears the queue and rejections reach the guests', async () => {
  const { join, say, room } = await setup()
  const guest = await join({})
  await say(guest, { t: 'claim', seat: 'anna' })
  await say(guest, { t: 'op', op: op('a', 'anna') })
  await say(guest, { t: 'op', op: op('b', 'anna') })
  const host = await join({ host: HOST })

  await say(host, { t: 'ack', applied: ['a'], rejected: ['b'] })
  assert.deepEqual(await room.ctx.storage.get('pending'), [])
  assert.deepEqual(guest.last('rejected').ids, ['b'])
})

test('host state is stored and broadcast; applied ops are not re-queued', async () => {
  const { join, say, room } = await setup()
  const host = await join({ host: HOST })
  const guest = await join({})
  await say(guest, { t: 'claim', seat: 'anna' })
  await say(host, { t: 'state', session: { ...session(), log: [{ p: 'anna', d: 3 }], ops: ['x1'] } })
  assert.deepEqual(guest.last('state').session.ops, ['x1'])

  await say(guest, { t: 'op', op: op('x1', 'anna') })
  assert.deepEqual(await room.ctx.storage.get('pending'), [])
})

test('guests cannot push state, and nobody can score a finished game', async () => {
  const { join, say, room } = await setup()
  const guest = await join({})
  await say(guest, { t: 'state', session: { hacked: true } })
  assert.equal((await room.ctx.storage.get('session')).id, 's1')

  const host = await join({ host: HOST })
  await say(guest, { t: 'claim', seat: 'anna' })
  await say(host, { t: 'state', session: { ...session(), finishedAt: 1 } })
  await say(guest, { t: 'op', op: op('late', 'anna') })
  assert.equal(guest.last('error').code, 'finished')
})

test('host can release a seat', async () => {
  const { join, say } = await setup()
  const guest = await join({})
  await say(guest, { t: 'claim', seat: 'anna' })
  const host = await join({ host: HOST })
  await say(host, { t: 'release', seat: 'anna' })
  assert.equal(guest.last('welcome').seat, null)
  assert.deepEqual(host.last('room').seats, {})
})

test('ending a room closes every socket and wipes storage', async () => {
  const { join, room } = await setup()
  const guest = await join({})
  assert.equal(await room.end('wrong'), 'unauthorized')
  assert.equal(await room.end(await sha256(HOST)), 'ok')
  assert.equal(guest.last('ended').t, 'ended')
  assert.equal(guest.closed, 4404)
  assert.equal(await room.snapshot(), null)
})

test('idle rooms expire on their alarm, active ones re-arm', async () => {
  const { room } = await setup()
  await room.alarm()
  assert.ok(await room.snapshot(), 'fresh room survives')
  await room.ctx.storage.put('updatedAt', Date.now() - ROOM_LIMITS.ttlMs)
  await room.alarm()
  assert.equal(await room.snapshot(), null)
})

test('oversized and malformed frames are refused', async () => {
  const { join, room } = await setup()
  const ws = await join({})
  await room.webSocketMessage(ws, 'x'.repeat(ROOM_LIMITS.messageBytes + 1))
  assert.equal(ws.last('error').code, 'too-large')
  await room.webSocketMessage(ws, '{nope')
  assert.equal(ws.last('error').code, 'bad-json')
})

test('validOp shape checks', () => {
  assert.ok(validOp({ id: 'a', p: 's', kind: 'add', d: -2 }, 's'))
  assert.ok(validOp({ id: 'a', p: 's', kind: 'cell', cat: 'x', v: null }, 's'))
  assert.ok(validOp({ id: 'a', p: 's', kind: 'round', index: 0, v: -60 }, 's'))
  assert.ok(!validOp({ id: 'a', p: 's', kind: 'add', d: 0 }, 's'))
  assert.ok(!validOp({ id: 'a', p: 's', kind: 'add', d: 1e9 }, 's'))
  assert.ok(!validOp({ id: 'a', p: 's', kind: 'round', index: 1.5, v: 1 }, 's'))
  assert.ok(!validOp({ id: 'a b', p: 's', kind: 'add', d: 1 }, 's'))
  assert.ok(!validOp({ id: 'a', p: 's', kind: 'nuke' }, 's'))
})
