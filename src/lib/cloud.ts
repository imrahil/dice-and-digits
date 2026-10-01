import { useSyncExternalStore } from 'react'
import type { Session } from '../types'
import { applyRemote, clearDirty, dirtyDocs, markAllDirty, type RemoteDoc } from './store'

/** Worker base URL, baked in at build time. Empty = local-only build, cloud UI hidden. */
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
export const cloudEnabled = API_URL !== ''

const GROUP_KEY = 'dice-digits:group'
const LIVE_KEY = 'dice-digits:live'

export type Group = {
  id: string
  secret: string
  name: string
  cursor: number
  lastSync?: number
}

type CloudState = {
  group: Group | null
  syncing: boolean
  error: string | null
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

let cloud: CloudState = { group: readJson<Group | null>(GROUP_KEY, null), syncing: false, error: null }
const listeners = new Set<() => void>()

function setCloud(patch: Partial<CloudState>) {
  cloud = { ...cloud, ...patch }
  if ('group' in patch) {
    if (cloud.group) localStorage.setItem(GROUP_KEY, JSON.stringify(cloud.group))
    else localStorage.removeItem(GROUP_KEY)
  }
  listeners.forEach((l) => l())
}

export function useCloud(): CloudState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => cloud,
  )
}

async function api<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (init.token) headers.Authorization = `Bearer ${init.token}`
  const res = await fetch(API_URL + path, { ...init, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
  return body as T
}

const groupToken = (g: Pick<Group, 'id' | 'secret'>) => `${g.id}.${g.secret}`

// ---- groups ----------------------------------------------------------------

export async function createGroup(name: string) {
  const g = await api<{ id: string; secret: string; name: string }>('/api/groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  setCloud({ group: { ...g, cursor: 0 }, error: null })
  markAllDirty()
  await syncNow()
}

/** Invite tokens are `<groupId>.<secret>`, carried in the #/join/… link. */
export async function lookupInvite(token: string): Promise<{ id: string; name: string }> {
  return api('/api/groups/me', { token })
}

export async function joinGroup(token: string) {
  const dot = token.indexOf('.')
  const info = await lookupInvite(token)
  setCloud({ group: { id: info.id, secret: token.slice(dot + 1), name: info.name, cursor: 0 }, error: null })
  markAllDirty()
  await syncNow()
}

export function leaveGroup() {
  setCloud({ group: null, error: null })
}

export function inviteLink(g: Group) {
  const base = location.href.split('#')[0]
  return `${base}#/join/${groupToken(g)}`
}

// ---- sync ------------------------------------------------------------------

const MAX_PUSH = 200 // matches LIMITS.docsPerPush in the worker

type SyncResponse = {
  group: { id: string; name: string }
  cursor: number
  more: boolean
  docs: RemoteDoc[]
}

let inflight: Promise<void> | null = null

/** Push dirty docs, pull everything new. Concurrent calls share one run. */
export function syncNow(): Promise<void> {
  if (!cloudEnabled || !cloud.group) return Promise.resolve()
  inflight ??= run().finally(() => {
    inflight = null
  })
  return inflight
}

async function run() {
  setCloud({ syncing: true })
  try {
    let more = true
    let rounds = 0
    while (more && rounds++ < 50) {
      const g = cloud.group
      if (!g) return
      const batch = dirtyDocs().slice(0, MAX_PUSH)
      const res = await api<SyncResponse>('/api/sync', {
        method: 'POST',
        token: groupToken(g),
        body: JSON.stringify({ cursor: g.cursor, docs: batch }),
      })
      clearDirty(batch)
      applyRemote(res.docs)
      setCloud({ group: { ...g, name: res.group.name, cursor: res.cursor, lastSync: Date.now() } })
      more = res.more || (batch.length === MAX_PUSH && dirtyDocs().length > 0)
    }
    setCloud({ error: null })
  } catch (e) {
    setCloud({ error: e instanceof Error ? e.message : String(e) })
  } finally {
    setCloud({ syncing: false })
  }
}

// ---- live scoreboards ------------------------------------------------------

type LiveHandle = { code: string; token: string }

export type LivePayload = { session: Session; sentAt: number }

const liveHandles = (): Record<string, LiveHandle> => readJson(LIVE_KEY, {})

export function liveHandle(sessionId: string): LiveHandle | undefined {
  return liveHandles()[sessionId]
}

function setLiveHandle(sessionId: string, h: LiveHandle | null) {
  const all = liveHandles()
  if (h) all[sessionId] = h
  else delete all[sessionId]
  localStorage.setItem(LIVE_KEY, JSON.stringify(all))
}

export function liveLink(code: string) {
  return `${location.href.split('#')[0]}#/live/${code}`
}

export async function startLive(session: Session): Promise<LiveHandle> {
  const h = await api<LiveHandle>('/api/live', {
    method: 'POST',
    body: JSON.stringify({ data: { session, sentAt: Date.now() } satisfies LivePayload }),
  })
  setLiveHandle(session.id, h)
  return h
}

export async function pushLive(session: Session) {
  const h = liveHandle(session.id)
  if (!h) return
  try {
    await api(`/api/live/${h.code}`, {
      method: 'PUT',
      token: h.token,
      body: JSON.stringify({ data: { session, sentAt: Date.now() } satisfies LivePayload }),
    })
  } catch (e) {
    // The board was swept or deleted elsewhere: stop trying.
    if (e instanceof Error && /not found/i.test(e.message)) setLiveHandle(session.id, null)
  }
}

export async function stopLive(sessionId: string) {
  const h = liveHandle(sessionId)
  setLiveHandle(sessionId, null)
  if (h) await api(`/api/live/${h.code}`, { method: 'DELETE', token: h.token }).catch(() => {})
}

export async function fetchLive(code: string) {
  return api<{ data: LivePayload; updatedAt: number }>(`/api/live/${encodeURIComponent(code)}`)
}
