// Minimal stand-ins for the Durable Object runtime: storage, hibernatable
// WebSockets and a namespace. Enough to drive Room's real logic in node:test.

export class FakeStorage {
  constructor() {
    this.map = new Map()
    this.alarm = null
  }
  async get(k) {
    const v = this.map.get(k)
    return v === undefined ? undefined : structuredClone(v)
  }
  async put(k, v) {
    if (typeof k === 'object') for (const [kk, vv] of Object.entries(k)) this.map.set(kk, structuredClone(vv))
    else this.map.set(k, structuredClone(v))
  }
  async delete(k) {
    return this.map.delete(k)
  }
  async deleteAll() {
    this.map.clear()
  }
  async setAlarm(t) {
    this.alarm = t
  }
  async deleteAlarm() {
    this.alarm = null
  }
}

export class FakeWS {
  constructor() {
    this.sent = []
    this.closed = null
    this.attachment = null
  }
  send(m) {
    if (this.closed) throw new Error('closed')
    this.sent.push(JSON.parse(m))
  }
  close(code) {
    this.closed ??= code
  }
  serializeAttachment(a) {
    this.attachment = structuredClone(a)
  }
  deserializeAttachment() {
    return structuredClone(this.attachment)
  }
  /** Messages of one type, oldest first. */
  of(t) {
    return this.sent.filter((m) => m.t === t)
  }
  last(t) {
    return this.of(t).at(-1)
  }
}

export class FakeCtx {
  constructor() {
    this.storage = new FakeStorage()
    this.ws = []
  }
  acceptWebSocket(ws) {
    this.ws.push(ws)
  }
  getWebSockets() {
    return this.ws.filter((w) => !w.closed)
  }
}

/** env.ROOMS: one Room instance per name, called directly (like RPC). */
export function fakeNamespace(RoomClass) {
  const rooms = new Map()
  return {
    rooms,
    idFromName: (name) => name,
    get(id) {
      if (!rooms.has(id)) rooms.set(id, new RoomClass(new FakeCtx(), {}))
      return rooms.get(id)
    },
  }
}
