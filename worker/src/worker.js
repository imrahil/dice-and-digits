/**
 * Dice & Digits API — Cloudflare Worker + D1 + a Durable Object per live game.
 *
 *   POST   /api/groups          { name }            → { id, secret, name, kind }
 *   POST   /api/groups          { name, kind: 'vault', id, secret } → { id, name, kind }
 *   GET    /api/groups/me       (auth)              → { id, name, kind }
 *   DELETE /api/groups/me       (auth, vaults only) → { ok }
 *   POST   /api/sync            (auth) { cursor, docs } → { cursor, docs, more }
 *   POST   /api/live            { data: { session } } → { code, token }
 *   GET    /api/live/:code                          → { data: { session }, updatedAt, host }
 *   PUT    /api/live/:code      (live token) { data: { session } }
 *   DELETE /api/live/:code      (live token)
 *   GET    /api/live/:code/ws   WebSocket — see src/room.js for the protocol
 *
 * Group auth is `Authorization: Bearer <groupId>.<secret>`; the secret travels
 * in the invite link and only its SHA-256 is stored.
 *
 * A personal backup is a group with kind 'vault'. The phone picks its id and
 * secret, both stretched from a six-word recovery code (src/lib/recovery.ts),
 * so the words alone open it on a new phone. The worker never sees the words.
 */

import { randomCode, randomString, sameHash, sha256 } from './crypto.js'
import { Room } from './room.js'

export { Room }

export const LIMITS = {
  bodyBytes: 512 * 1024,
  docBytes: 64 * 1024,
  docsPerPush: 200,
  pageSize: 500,
  docsPerGroup: 20000,
  liveBytes: 128 * 1024,
  nameLength: 60,
}

const KINDS = new Set(['player', 'game', 'session'])
const ID_RE = /^[\w:.-]{1,80}$/
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O, 1/I/L
const CODE_RE = /^[A-Z2-9]{6}$/
const VAULT_ID_RE = /^[0-9a-f]{32}$/
const VAULT_SECRET_RE = /^[0-9a-f]{64}$/

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// ---- helpers ---------------------------------------------------------------

function bearer(request) {
  const h = request.headers.get('Authorization') ?? ''

  return h.startsWith('Bearer ') ? h.slice(7).trim() : ''
}

async function readJson(request) {
  const text = await request.text()

  if (text.length > LIMITS.bodyBytes) {
    throw new HttpError(413, 'Body too large')
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, 'Invalid JSON')
  }
}

function cleanName(name) {
  if (typeof name !== 'string') {
    return ''
  }

  return name.trim().slice(0, LIMITS.nameLength)
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin')
  const allowed = allowedOrigins(env)
  const h = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }

  // Reads are public (a live link must open anywhere); writes are origin-gated below.
  if (origin && (allowed.length === 0 || allowed.includes(origin))) {
    h['Access-Control-Allow-Origin'] = origin
  } else {
    h['Access-Control-Allow-Origin'] = '*'
  }

  return h
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  })
}

/** Browser writes must come from the app. CORS alone would not stop a plain curl. */
function checkWriteOrigin(request, env) {
  const origin = request.headers.get('Origin')
  const allowed = allowedOrigins(env)

  if (origin && allowed.length && !allowed.includes(origin)) {
    throw new HttpError(403, 'Origin not allowed')
  }
}

// ---- groups & sync ---------------------------------------------------------

async function authGroup(request, env) {
  const token = bearer(request)
  const dot = token.indexOf('.')

  if (dot < 1) {
    throw new HttpError(401, 'Missing group token')
  }

  const id = token.slice(0, dot)
  const secret = token.slice(dot + 1)

  if (!ID_RE.test(id)) {
    throw new HttpError(401, 'Bad group token')
  }

  const group = await env.DB.prepare('SELECT id, name, kind, secret_hash FROM groups WHERE id = ?1').bind(id).first()

  if (!group || !sameHash(group.secret_hash, await sha256(secret))) {
    throw new HttpError(401, 'Unknown group')
  }

  return group
}

async function createGroup(request, env) {
  const body = await readJson(request)
  const name = cleanName(body?.name)

  if (!name) {
    throw new HttpError(400, 'Name required')
  }

  if (body?.kind === 'vault') {
    return createVault(env, name, body)
  }

  const id = crypto.randomUUID()
  const secret = randomString(24)

  await env.DB.prepare("INSERT INTO groups (id, name, kind, secret_hash, created_at, rev) VALUES (?1, ?2, 'group', ?3, ?4, 0)")
    .bind(id, name, await sha256(secret), Date.now())
    .run()

  return json({ id, secret, name, kind: 'group' }, 201)
}

/** A personal backup: id and secret come from the phone, derived from its recovery words. */
async function createVault(env, name, { id, secret }) {
  if (typeof id !== 'string' || !VAULT_ID_RE.test(id) || typeof secret !== 'string' || !VAULT_SECRET_RE.test(secret)) {
    throw new HttpError(400, 'Backup id and secret required')
  }

  const { meta } = await env.DB.prepare(
    "INSERT INTO groups (id, name, kind, secret_hash, created_at, rev) VALUES (?1, ?2, 'vault', ?3, ?4, 0) ON CONFLICT (id) DO NOTHING",
  )
    .bind(id, name, await sha256(secret), Date.now())
    .run()

  if (!meta.changes) {
    throw new HttpError(409, 'Backup already exists')
  }

  return json({ id, name, kind: 'vault' }, 201)
}

/** Deletes a personal backup and all its docs. Shared groups can't be deleted: others rely on them. */
async function deleteGroup(request, env) {
  const group = await authGroup(request, env)

  if (group.kind !== 'vault') {
    throw new HttpError(403, 'Only a personal backup can be deleted')
  }

  await env.DB.batch([
    env.DB.prepare('DELETE FROM docs WHERE group_id = ?1').bind(group.id),
    env.DB.prepare('DELETE FROM groups WHERE id = ?1').bind(group.id),
  ])

  return json({ ok: true })
}

function validDoc(d) {
  return (
    d &&
    KINDS.has(d.kind) &&
    typeof d.id === 'string' &&
    ID_RE.test(d.id) &&
    Number.isFinite(d.updatedAt) &&
    d.data &&
    typeof d.data === 'object'
  )
}

export async function sync(request, env) {
  const group = await authGroup(request, env)
  const body = await readJson(request)
  const cursor = Number.isInteger(body?.cursor) && body.cursor > 0 ? body.cursor : 0
  const incoming = Array.isArray(body?.docs) ? body.docs : []

  if (incoming.length > LIMITS.docsPerPush) {
    throw new HttpError(413, `At most ${LIMITS.docsPerPush} docs per push`)
  }

  const docs = []

  for (const d of incoming) {
    if (!validDoc(d)) {
      throw new HttpError(400, 'Invalid doc')
    }

    const data = JSON.stringify(d.data)

    if (data.length > LIMITS.docBytes) {
      throw new HttpError(413, `Doc ${d.id} too large`)
    }

    docs.push({ kind: d.kind, id: d.id, updatedAt: Math.trunc(d.updatedAt), data })
  }

  if (docs.length) {
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM docs WHERE group_id = ?1').bind(group.id).first()

    if (n + docs.length > LIMITS.docsPerGroup) {
      throw new HttpError(507, 'Group is full')
    }

    // One transaction: bump the group rev, then upsert every doc at that rev.
    // The WHERE on the upsert is last-write-wins: an older edit never
    // overwrites a newer one, whichever phone syncs first.
    const stmts = [env.DB.prepare('UPDATE groups SET rev = rev + 1 WHERE id = ?1').bind(group.id)]

    for (const d of docs) {
      stmts.push(
        env.DB.prepare(
          `INSERT INTO docs (group_id, kind, id, updated_at, rev, data)
           VALUES (?1, ?2, ?3, ?4, (SELECT rev FROM groups WHERE id = ?1), ?5)
           ON CONFLICT (group_id, kind, id) DO UPDATE SET
             updated_at = excluded.updated_at, rev = excluded.rev, data = excluded.data
           WHERE excluded.updated_at > docs.updated_at`,
        ).bind(group.id, d.kind, d.id, d.updatedAt, d.data),
      )
    }

    await env.DB.batch(stmts)
  }

  // Pull. Every doc of one push shares a rev, so a page must never end in the
  // middle of a rev — otherwise the next cursor would skip the rest of it.
  const { results } = await env.DB.prepare(
    `SELECT kind, id, updated_at, rev, data FROM docs
     WHERE group_id = ?1 AND rev > ?2 ORDER BY rev LIMIT ?3`,
  )
    .bind(group.id, cursor, LIMITS.pageSize + 1)
    .all()

  let rows = results
  let more = false

  if (rows.length > LIMITS.pageSize) {
    more = true
    const lastRev = rows[rows.length - 1].rev

    rows = rows.filter((r) => r.rev !== lastRev)
  }

  const nextCursor = rows.length ? rows[rows.length - 1].rev : cursor

  // A pushed doc the server kept a newer version of (e.g. this phone's clock is
  // behind) is not in the pull when its rev is at or below the cursor. Send
  // the winning version back anyway, or this phone would keep showing its own.
  if (docs.length) {
    const sent = new Map(docs.map((d) => [`${d.kind}:${d.id}`, d.updatedAt]))
    const inPull = new Set(rows.map((r) => `${r.kind}:${r.id}`))
    const { results: current } = await env.DB.prepare(
      `SELECT kind, id, updated_at, rev, data FROM docs
       WHERE group_id = ?1 AND kind || ':' || id IN (SELECT value FROM json_each(?2))`,
    )
      .bind(group.id, JSON.stringify([...sent.keys()]))
      .all()

    for (const r of current) {
      const key = `${r.kind}:${r.id}`

      if (r.updated_at > sent.get(key) && !inPull.has(key)) {
        rows.push(r)
      }
    }
  }

  return json({
    group: { id: group.id, name: group.name, kind: group.kind },
    cursor: nextCursor,
    more,
    docs: rows.map((r) => ({ kind: r.kind, id: r.id, updatedAt: r.updated_at, data: JSON.parse(r.data) })),
  })
}

// ---- live games (Durable Object rooms) -------------------------------------

function liveSession(body) {
  const session = body?.data?.session

  if (!session || typeof session !== 'object' || !Array.isArray(session.seats)) {
    throw new HttpError(400, 'data.session required')
  }

  if (JSON.stringify(session).length > LIMITS.liveBytes) {
    throw new HttpError(413, 'Live data too large')
  }

  return session
}

const room = (env, code) => env.ROOMS.get(env.ROOMS.idFromName(code))

/** Call a Room method through its internal fetch interface (see Room.fetch). */
async function call(stub, name, args = {}) {
  const res = await stub.fetch(
    new Request(`https://room/rpc/${name}`, { method: 'POST', body: JSON.stringify(args), headers: { 'Content-Type': 'application/json' } }),
  )

  if (!res.ok) {
    throw new Error(`room ${name}: HTTP ${res.status}`)
  }

  return (await res.json()).result
}

async function createLive(request, env) {
  const session = liveSession(await readJson(request))
  const token = randomString(24)
  const hash = await sha256(token)

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(6, CODE_ALPHABET)

    if (await call(room(env, code), 'init', { hostHash: hash, session })) {
      return json({ code, token }, 201)
    }
  }

  throw new HttpError(503, 'Could not allocate a code')
}

function hostResult(result) {
  if (result === 'missing') {
    throw new HttpError(404, 'Not found')
  }

  if (result === 'unauthorized') {
    throw new HttpError(401, 'Bad live token')
  }

  return json({ ok: true })
}

async function routeLive(request, env, code, ws) {
  if (!CODE_RE.test(code)) {
    throw new HttpError(404, 'Not found')
  }

  const stub = room(env, code)

  if (ws) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      throw new HttpError(426, 'Expected WebSocket')
    }

    checkWriteOrigin(request, env)

    return stub.fetch(request)
  }

  switch (request.method) {
    case 'GET': {
      const snap = await call(stub, 'snapshot')

      if (!snap) {
        throw new HttpError(404, 'Not found')
      }

      return json({ data: { session: snap.session }, updatedAt: snap.updatedAt, host: snap.host })
    }

    case 'PUT': {
      checkWriteOrigin(request, env)
      const session = liveSession(await readJson(request))

      return hostResult(await call(stub, 'putState', { hostHash: await sha256(bearer(request)), session }))
    }

    case 'DELETE': {
      checkWriteOrigin(request, env)

      return hostResult(await call(stub, 'end', { hostHash: await sha256(bearer(request)) }))
    }
  }

  throw new HttpError(405, 'Method not allowed')
}

// ---- router ----------------------------------------------------------------

async function route(request, env) {
  const { pathname } = new URL(request.url)
  const m = request.method

  if (pathname === '/api/groups' && m === 'POST') {
    checkWriteOrigin(request, env)

    return createGroup(request, env)
  }

  if (pathname === '/api/groups/me' && m === 'GET') {
    const g = await authGroup(request, env)

    return json({ id: g.id, name: g.name, kind: g.kind })
  }

  if (pathname === '/api/groups/me' && m === 'DELETE') {
    checkWriteOrigin(request, env)

    return deleteGroup(request, env)
  }

  if (pathname === '/api/sync' && m === 'POST') {
    checkWriteOrigin(request, env)

    return sync(request, env)
  }

  if (pathname === '/api/live' && m === 'POST') {
    checkWriteOrigin(request, env)

    return createLive(request, env)
  }

  const live = pathname.match(/^\/api\/live\/([^/]+)(\/ws)?$/)

  if (live) {
    return routeLive(request, env, live[1].toUpperCase(), Boolean(live[2]))
  }

  if (pathname === '/api/health') {
    return json({ ok: true })
  }

  throw new HttpError(404, 'Not found')
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    try {
      const res = await route(request, env)

      if (res.status === 101) {
        // WebSocket upgrade: headers are immutable and CORS doesn't apply
        return res
      }

      for (const [k, v] of Object.entries(cors)) {
        res.headers.set(k, v)
      }

      return res
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500

      if (status === 500) {
        console.error(e)
      }

      return json({ error: e instanceof HttpError ? e.message : 'Internal error' }, status, cors)
    }
  },
}
