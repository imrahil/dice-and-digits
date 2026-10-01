/**
 * Dice & Digits API — Cloudflare Worker + D1.
 *
 *   POST   /api/groups          { name }            → { id, secret, name }
 *   GET    /api/groups/me       (auth)              → { id, name }
 *   POST   /api/sync            (auth) { cursor, docs } → { cursor, docs, more }
 *   POST   /api/live            { data }            → { code, token }
 *   GET    /api/live/:code                          → { data, updatedAt }
 *   PUT    /api/live/:code      (live token) { data }
 *   DELETE /api/live/:code      (live token)
 *
 * Group auth is `Authorization: Bearer <groupId>.<secret>`; the secret travels
 * in the invite link and only its SHA-256 is stored.
 */

export const LIMITS = {
  bodyBytes: 512 * 1024,
  docBytes: 64 * 1024,
  docsPerPush: 200,
  pageSize: 500,
  docsPerGroup: 20000,
  liveBytes: 64 * 1024,
  liveTtlMs: 48 * 60 * 60 * 1000,
  nameLength: 60,
}

const KINDS = new Set(['player', 'game', 'session'])
const ID_RE = /^[\w:.-]{1,80}$/
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O, 1/I/L
const CODE_RE = /^[A-Z2-9]{6}$/

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// ---- helpers ---------------------------------------------------------------

function randomString(bytes) {
  const b = crypto.getRandomValues(new Uint8Array(bytes))
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomCode() {
  const b = crypto.getRandomValues(new Uint8Array(6))
  return [...b].map((x) => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('')
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

function sameHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function bearer(request) {
  const h = request.headers.get('Authorization') ?? ''
  return h.startsWith('Bearer ') ? h.slice(7).trim() : ''
}

async function readJson(request) {
  const text = await request.text()
  if (text.length > LIMITS.bodyBytes) throw new HttpError(413, 'Body too large')
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, 'Invalid JSON')
  }
}

function cleanName(name) {
  if (typeof name !== 'string') return ''
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
  if (origin && (allowed.length === 0 || allowed.includes(origin))) h['Access-Control-Allow-Origin'] = origin
  else h['Access-Control-Allow-Origin'] = '*'
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
  if (origin && allowed.length && !allowed.includes(origin)) throw new HttpError(403, 'Origin not allowed')
}

// ---- groups & sync ---------------------------------------------------------

async function authGroup(request, env) {
  const token = bearer(request)
  const dot = token.indexOf('.')
  if (dot < 1) throw new HttpError(401, 'Missing group token')
  const id = token.slice(0, dot)
  const secret = token.slice(dot + 1)
  if (!ID_RE.test(id)) throw new HttpError(401, 'Bad group token')
  const group = await env.DB.prepare('SELECT id, name, secret_hash FROM groups WHERE id = ?1').bind(id).first()
  if (!group || !sameHash(group.secret_hash, await sha256(secret))) throw new HttpError(401, 'Unknown group')
  return group
}

async function createGroup(request, env) {
  const body = await readJson(request)
  const name = cleanName(body?.name)
  if (!name) throw new HttpError(400, 'Name required')
  const id = crypto.randomUUID()
  const secret = randomString(24)
  await env.DB.prepare('INSERT INTO groups (id, name, secret_hash, created_at, rev) VALUES (?1, ?2, ?3, ?4, 0)')
    .bind(id, name, await sha256(secret), Date.now())
    .run()
  return json({ id, secret, name }, 201)
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
  if (incoming.length > LIMITS.docsPerPush) throw new HttpError(413, `At most ${LIMITS.docsPerPush} docs per push`)

  const docs = []
  for (const d of incoming) {
    if (!validDoc(d)) throw new HttpError(400, 'Invalid doc')
    const data = JSON.stringify(d.data)
    if (data.length > LIMITS.docBytes) throw new HttpError(413, `Doc ${d.id} too large`)
    docs.push({ kind: d.kind, id: d.id, updatedAt: Math.trunc(d.updatedAt), data })
  }

  if (docs.length) {
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM docs WHERE group_id = ?1').bind(group.id).first()
    if (n + docs.length > LIMITS.docsPerGroup) throw new HttpError(507, 'Group is full')

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

  return json({
    group: { id: group.id, name: group.name },
    cursor: nextCursor,
    more,
    docs: rows.map((r) => ({ kind: r.kind, id: r.id, updatedAt: r.updated_at, data: JSON.parse(r.data) })),
  })
}

// ---- live scoreboards ------------------------------------------------------

function liveData(body) {
  if (!body?.data || typeof body.data !== 'object') throw new HttpError(400, 'data required')
  const data = JSON.stringify(body.data)
  if (data.length > LIMITS.liveBytes) throw new HttpError(413, 'Live data too large')
  return data
}

async function createLive(request, env) {
  const data = liveData(await readJson(request))
  const token = randomString(24)
  const hash = await sha256(token)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode()
    const res = await env.DB.prepare(
      'INSERT INTO live (code, token_hash, data, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (code) DO NOTHING',
    )
      .bind(code, hash, data, Date.now())
      .run()
    if (res.meta.changes === 1) return json({ code, token }, 201)
  }
  throw new HttpError(503, 'Could not allocate a code')
}

async function authLive(request, env, code) {
  const row = await env.DB.prepare('SELECT token_hash FROM live WHERE code = ?1').bind(code).first()
  if (!row) throw new HttpError(404, 'Not found')
  if (!sameHash(row.token_hash, await sha256(bearer(request)))) throw new HttpError(401, 'Bad live token')
}

async function routeLive(request, env, code) {
  if (!CODE_RE.test(code)) throw new HttpError(404, 'Not found')
  switch (request.method) {
    case 'GET': {
      const row = await env.DB.prepare('SELECT data, updated_at FROM live WHERE code = ?1').bind(code).first()
      if (!row) throw new HttpError(404, 'Not found')
      return json({ data: JSON.parse(row.data), updatedAt: row.updated_at })
    }
    case 'PUT': {
      checkWriteOrigin(request, env)
      await authLive(request, env, code)
      const data = liveData(await readJson(request))
      await env.DB.prepare('UPDATE live SET data = ?2, updated_at = ?3 WHERE code = ?1')
        .bind(code, data, Date.now())
        .run()
      return json({ ok: true })
    }
    case 'DELETE': {
      checkWriteOrigin(request, env)
      await authLive(request, env, code)
      await env.DB.prepare('DELETE FROM live WHERE code = ?1').bind(code).run()
      return json({ ok: true })
    }
  }
  throw new HttpError(405, 'Method not allowed')
}

export async function sweepLive(env, now = Date.now()) {
  const res = await env.DB.prepare('DELETE FROM live WHERE updated_at < ?1')
    .bind(now - LIMITS.liveTtlMs)
    .run()
  return res.meta.changes
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
    return json({ id: g.id, name: g.name })
  }
  if (pathname === '/api/sync' && m === 'POST') {
    checkWriteOrigin(request, env)
    return sync(request, env)
  }
  if (pathname === '/api/live' && m === 'POST') {
    checkWriteOrigin(request, env)
    return createLive(request, env)
  }
  const live = pathname.match(/^\/api\/live\/([^/]+)$/)
  if (live) return routeLive(request, env, live[1].toUpperCase())
  if (pathname === '/api/health') return json({ ok: true })
  throw new HttpError(404, 'Not found')
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    try {
      const res = await route(request, env)
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
      return res
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500
      if (status === 500) console.error(e)
      return json({ error: e instanceof HttpError ? e.message : 'Internal error' }, status, cors)
    }
  },

  async scheduled(_event, env) {
    const n = await sweepLive(env)
    if (n) console.log(`swept ${n} idle live games`)
  },
}
