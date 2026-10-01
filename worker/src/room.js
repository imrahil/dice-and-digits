/**
 * Room — one Durable Object per live game (named by its 6-letter code).
 *
 * The host phone stays the single source of truth for the game: it keeps
 * scoring offline and pushes its whole session here. Guests who joined a seat
 * send small *ops* ("add 3 to me", "my Science is 12"); the room queues them,
 * relays them to the host, and the host applies them and pushes the new state,
 * which the room broadcasts to everyone. If the host is offline, ops wait in
 * the queue until it reconnects — nothing is lost and nothing is merged here.
 *
 * WebSocket protocol (JSON text frames)
 *
 *   client → room
 *     { t: 'hello', host?: token, guest?: guestToken }   first frame, picks the role
 *     { t: 'state', session }                            host: new snapshot
 *     { t: 'ack', applied: [opId], rejected: [opId] }    host: done with these ops
 *     { t: 'release', seat }                             host: free a claimed seat
 *     { t: 'claim', seat }                               guest: take a seat
 *     { t: 'leave' }                                     guest: give the seat back
 *     { t: 'op', op }                                    guest: score for own seat
 *
 *   room → client
 *     { t: 'welcome', role, seat }
 *     { t: 'state', session, updatedAt }
 *     { t: 'room', seats: { [seatId]: true }, host: bool, guests: n }
 *     { t: 'ops', ops }                                  host only
 *     { t: 'claimed', seat, guest }                      guest: keep `guest` to resume
 *     { t: 'rejected', ids }
 *     { t: 'error', code, id? }
 *     { t: 'ended' }
 *
 * Uses the WebSocket Hibernation API, so an idle room costs nothing between
 * messages. No state is kept in memory across events — storage is the truth.
 */

import { randomString, sha256 } from './crypto.js'

export const ROOM_LIMITS = {
  messageBytes: 192 * 1024, // a 128 KB session plus its envelope
  pendingOps: 500,
  ttlMs: 48 * 60 * 60 * 1000, // idle rooms delete themselves
}

const OP_ID = /^[\w-]{1,40}$/
const MAX_ABS = 1_000_000

/** Shape check only — the host decides whether an op makes sense for the game. */
export function validOp(op, seat) {
  if (!op || typeof op !== 'object' || !OP_ID.test(op.id ?? '') || op.p !== seat) return false
  const num = (v) => Number.isFinite(v) && Math.abs(v) <= MAX_ABS
  switch (op.kind) {
    case 'add':
      return num(op.d) && op.d !== 0
    case 'cell':
      return typeof op.cat === 'string' && op.cat.length <= 40 && (op.v === null || num(op.v))
    case 'round':
      return Number.isInteger(op.index) && op.index >= 0 && op.index < 1000 && num(op.v)
    default:
      return false
  }
}

export class Room {
  constructor(ctx, env) {
    this.ctx = ctx
    this.env = env
  }

  // ---- calls from the router -------------------------------------------------
  // Reached through fetch() (POST /rpc/<name>) rather than Workers RPC, so
  // the class needs no `cloudflare:workers` import and runs as-is in node:test.

  /** False when the code is already taken (the router retries with another). */
  async init(hostHash, session) {
    if (await this.ctx.storage.get('meta')) return false
    const now = Date.now()
    await this.ctx.storage.put({ meta: { hostHash, createdAt: now }, session, updatedAt: now, claims: {}, pending: [] })
    await this.ctx.storage.setAlarm(now + ROOM_LIMITS.ttlMs)
    return true
  }

  async snapshot() {
    const meta = await this.ctx.storage.get('meta')
    if (!meta) return null
    const [session, updatedAt] = await Promise.all([this.ctx.storage.get('session'), this.ctx.storage.get('updatedAt')])
    return { session, updatedAt, host: this.sockets().some((ws) => this.att(ws).role === 'host') }
  }

  /** HTTP fallback for the host (e.g. the final state sent as the game ends). */
  async putState(hostHash, session) {
    const meta = await this.ctx.storage.get('meta')
    if (!meta) return 'missing'
    if (meta.hostHash !== hostHash) return 'unauthorized'
    await this.saveState(session)
    return 'ok'
  }

  async end(hostHash) {
    const meta = await this.ctx.storage.get('meta')
    if (!meta) return 'missing'
    if (meta.hostHash !== hostHash) return 'unauthorized'
    await this.shutdown()
    return 'ok'
  }

  // ---- WebSocket -------------------------------------------------------------

  async fetch(request) {
    const rpc = new URL(request.url).pathname.match(/^\/rpc\/(\w+)$/)
    if (rpc && request.method === 'POST') {
      const a = await request.json()
      const calls = {
        init: () => this.init(a.hostHash, a.session),
        snapshot: () => this.snapshot(),
        putState: () => this.putState(a.hostHash, a.session),
        end: () => this.end(a.hostHash),
      }
      if (!calls[rpc[1]]) return new Response('Unknown call', { status: 404 })
      return Response.json({ result: await calls[rpc[1]]() })
    }
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 })
    if (!(await this.ctx.storage.get('meta'))) return new Response('Not found', { status: 404 })
    const pair = new WebSocketPair()
    this.connect(pair[1])
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  connect(ws) {
    this.ctx.acceptWebSocket(ws)
    ws.serializeAttachment({ role: null, seat: null, guest: null })
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > ROOM_LIMITS.messageBytes) return this.send(ws, { t: 'error', code: 'too-large' })
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return this.send(ws, { t: 'error', code: 'bad-json' })
    }
    const me = this.att(ws)

    if (msg.t === 'hello') return this.hello(ws, msg)
    if (!me.role) return this.send(ws, { t: 'error', code: 'hello-first' })

    if (me.role === 'host') {
      if (msg.t === 'state' && msg.session && typeof msg.session === 'object') return this.saveState(msg.session)
      if (msg.t === 'ack') return this.ack(msg)
      if (msg.t === 'release') return this.release(msg.seat)
      return
    }

    if (msg.t === 'claim') return this.claim(ws, me, msg.seat)
    if (msg.t === 'leave') return this.leave(ws, me)
    if (msg.t === 'op') return this.op(ws, me, msg.op)
  }

  async webSocketClose(ws) {
    try {
      ws.close(1000)
    } catch {
      // already closed
    }
    await this.broadcastRoom(ws)
  }

  async webSocketError(ws) {
    await this.broadcastRoom(ws)
  }

  async alarm() {
    const updatedAt = (await this.ctx.storage.get('updatedAt')) ?? 0
    if (Date.now() - updatedAt >= ROOM_LIMITS.ttlMs - 1000) await this.shutdown()
    else await this.ctx.storage.setAlarm(updatedAt + ROOM_LIMITS.ttlMs)
  }

  // ---- handlers ----------------------------------------------------------------

  async hello(ws, msg) {
    const meta = await this.ctx.storage.get('meta')
    if (!meta) return this.send(ws, { t: 'ended' })
    const claims = (await this.ctx.storage.get('claims')) ?? {}

    if (typeof msg.host === 'string') {
      if (meta.hostHash !== (await sha256(msg.host))) return this.send(ws, { t: 'error', code: 'not-host' })
      ws.serializeAttachment({ role: 'host', seat: null, guest: null })
      this.send(ws, { t: 'welcome', role: 'host', seat: null })
      const pending = (await this.ctx.storage.get('pending')) ?? []
      if (pending.length) this.send(ws, { t: 'ops', ops: pending })
    } else {
      // A returning guest gets their seat back from the token they kept.
      let seat = null
      let guest = null
      if (typeof msg.guest === 'string' && msg.guest) {
        const h = await sha256(msg.guest)
        seat = Object.keys(claims).find((s) => claims[s] === h) ?? null
        if (seat) guest = h
      }
      ws.serializeAttachment({ role: 'guest', seat, guest })
      this.send(ws, { t: 'welcome', role: 'guest', seat })
    }

    const [session, updatedAt] = await Promise.all([this.ctx.storage.get('session'), this.ctx.storage.get('updatedAt')])
    this.send(ws, { t: 'state', session, updatedAt })
    await this.broadcastRoom()
  }

  async saveState(session) {
    const now = Date.now()
    await this.ctx.storage.put({ session, updatedAt: now })
    await this.ctx.storage.setAlarm(now + ROOM_LIMITS.ttlMs)
    this.broadcast({ t: 'state', session, updatedAt: now })
  }

  async ack(msg) {
    const done = new Set([...(msg.applied ?? []), ...(msg.rejected ?? [])])
    const pending = (await this.ctx.storage.get('pending')) ?? []
    await this.ctx.storage.put('pending', pending.filter((o) => !done.has(o.id)))
    const rejected = (msg.rejected ?? []).filter((id) => typeof id === 'string')
    if (rejected.length) this.broadcast({ t: 'rejected', ids: rejected })
  }

  async claim(ws, me, seat) {
    const session = await this.ctx.storage.get('session')
    if (!session?.seats?.some((s) => s.id === seat)) return this.send(ws, { t: 'error', code: 'no-seat' })
    const claims = (await this.ctx.storage.get('claims')) ?? {}

    let token = null
    let hash = me.guest
    if (!hash) {
      token = randomString(18)
      hash = await sha256(token)
    }
    if (claims[seat] && claims[seat] !== hash) return this.send(ws, { t: 'error', code: 'taken' })

    // One seat per phone: moving seats frees the old one.
    for (const s of Object.keys(claims)) if (claims[s] === hash) delete claims[s]
    claims[seat] = hash
    await this.ctx.storage.put('claims', claims)

    // Every socket of this guest (e.g. two tabs) moves with it.
    for (const other of this.sockets()) {
      const a = this.att(other)
      if (other === ws || (a.guest && a.guest === hash)) other.serializeAttachment({ role: 'guest', seat, guest: hash })
    }
    this.send(ws, { t: 'claimed', seat, guest: token })
    await this.broadcastRoom()
  }

  async leave(ws, me) {
    if (!me.seat) return
    const claims = (await this.ctx.storage.get('claims')) ?? {}
    if (claims[me.seat] === me.guest) delete claims[me.seat]
    await this.ctx.storage.put('claims', claims)
    ws.serializeAttachment({ role: 'guest', seat: null, guest: me.guest })
    this.send(ws, { t: 'welcome', role: 'guest', seat: null })
    await this.broadcastRoom()
  }

  async release(seat) {
    const claims = (await this.ctx.storage.get('claims')) ?? {}
    const hash = claims[seat]
    if (!hash) return
    delete claims[seat]
    await this.ctx.storage.put('claims', claims)
    for (const ws of this.sockets()) {
      const a = this.att(ws)
      if (a.role === 'guest' && a.seat === seat) {
        ws.serializeAttachment({ role: 'guest', seat: null, guest: a.guest })
        this.send(ws, { t: 'welcome', role: 'guest', seat: null })
      }
    }
    await this.broadcastRoom()
  }

  async op(ws, me, op) {
    if (!me.seat) return this.send(ws, { t: 'error', code: 'no-seat', id: op?.id })
    if (!validOp(op, me.seat)) return this.send(ws, { t: 'error', code: 'bad-op', id: op?.id })
    const session = await this.ctx.storage.get('session')
    if (session?.finishedAt) return this.send(ws, { t: 'error', code: 'finished', id: op.id })
    // Already applied (a resend after reconnect): nothing to do.
    if (session?.ops?.includes(op.id)) return

    const pending = (await this.ctx.storage.get('pending')) ?? []
    if (pending.some((o) => o.id === op.id)) return
    if (pending.length >= ROOM_LIMITS.pendingOps) return this.send(ws, { t: 'error', code: 'full', id: op.id })

    const clean = { ...op, at: Date.now() }
    pending.push(clean)
    await this.ctx.storage.put('pending', pending)
    for (const host of this.sockets().filter((s) => this.att(s).role === 'host')) this.send(host, { t: 'ops', ops: [clean] })
  }

  // ---- utils -------------------------------------------------------------------

  async shutdown() {
    for (const ws of this.sockets()) {
      this.send(ws, { t: 'ended' })
      try {
        ws.close(4404, 'ended')
      } catch {
        // ignore
      }
    }
    await this.ctx.storage.deleteAlarm?.()
    await this.ctx.storage.deleteAll()
  }

  sockets(except) {
    return this.ctx.getWebSockets().filter((ws) => ws !== except)
  }

  att(ws) {
    return ws.deserializeAttachment() ?? { role: null, seat: null, guest: null }
  }

  send(ws, msg) {
    try {
      ws.send(JSON.stringify(msg))
    } catch {
      // socket went away; webSocketClose will tidy up
    }
  }

  broadcast(msg, except) {
    for (const ws of this.sockets(except)) if (this.att(ws).role) this.send(ws, msg)
  }

  async broadcastRoom(except) {
    const claims = (await this.ctx.storage.get('claims')) ?? {}
    const live = this.sockets(except).map((ws) => this.att(ws))
    this.broadcast(
      {
        t: 'room',
        seats: Object.fromEntries(Object.keys(claims).map((s) => [s, true])),
        host: live.some((a) => a.role === 'host'),
        guests: live.filter((a) => a.role === 'guest').length,
      },
      except,
    )
  }
}
