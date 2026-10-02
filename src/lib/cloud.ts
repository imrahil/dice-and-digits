import { useSyncExternalStore } from 'react'
import type { Session } from '../types'
import { applyRemote, clearDirty, dirtyDocs, markAllDirty, type RemoteDoc } from './store'
import { deriveKey, newCode, type Code } from './recovery'

/** Worker base URL, baked in at build time. Empty = local-only build, cloud UI hidden. */
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
export const cloudEnabled = API_URL !== ''

const GROUP_KEY = 'dice-digits:group'
const LIVE_KEY = 'dice-digits:live'

export type GroupKind = 'group' | 'vault'

export type Group = {
  id: string
  secret: string
  name: string
  cursor: number
  lastSync?: number
  /** 'vault' = a personal backup, opened by its recovery words. Missing = a shared group. */
  kind?: GroupKind
  /** A backup's recovery code (recovery.ts), kept to show its words again. */
  code?: Code
  /** When the user confirmed they saved the recovery words. */
  savedAt?: number
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
    if (cloud.group) {
      localStorage.setItem(GROUP_KEY, JSON.stringify(cloud.group))
    } else {
      localStorage.removeItem(GROUP_KEY)
    }
  }

  listeners.forEach((l) => l())
}

/** Current cloud status outside React (tests, logging). */
export const getCloud = (): CloudState => cloud

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

  if (init.token) {
    headers.Authorization = `Bearer ${init.token}`
  }

  const res = await fetch(API_URL + path, { ...init, headers })
  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(body?.error ?? `HTTP ${res.status}`)
  }

  return body as T
}

const groupToken = (g: Pick<Group, 'id' | 'secret'>) => `${g.id}.${g.secret}`

// ---- groups ----------------------------------------------------------------

export async function createGroup(name: string) {
  const g = await api<{ id: string; secret: string; name: string; kind: GroupKind }>('/api/groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

  setCloud({ group: { ...g, cursor: 0 }, error: null })
  markAllDirty()
  await syncNow()
}

/** Invite tokens are `<groupId>.<secret>`, carried in the #/join/… link. */
export async function lookupInvite(token: string): Promise<{ id: string; name: string; kind: GroupKind }> {
  return api('/api/groups/me', { token })
}

/** Joins a group by its token, or restores a backup from its recovery code. */
export async function joinGroup(token: string, code?: Code) {
  const dot = token.indexOf('.')
  const info = await lookupInvite(token)
  // Restoring a backup proves the words were kept somewhere.
  const savedAt = info.kind === 'vault' ? Date.now() : undefined

  setCloud({
    group: { id: info.id, secret: token.slice(dot + 1), name: info.name, kind: info.kind, code, savedAt, cursor: 0 },
    error: null,
  })
  markAllDirty()
  await syncNow()
}

export function leaveGroup() {
  setCloud({ group: null, error: null })
}

// ---- personal backup ---------------------------------------------------------
// A vault is a group of one. Its id and secret are stretched from six recovery
// words on the phone (recovery.ts), so the words alone restore it.

/** The group token a recovery code opens. Slow on purpose (PBKDF2). */
export async function backupToken(code: Code): Promise<string> {
  const { id, secret } = await deriveKey(code)

  return `${id}.${secret}`
}

export async function createBackup(name: string) {
  const code = newCode()
  const { id, secret } = await deriveKey(code)

  await api('/api/groups', { method: 'POST', body: JSON.stringify({ name, kind: 'vault', id, secret }) })
  setCloud({ group: { id, secret, name, kind: 'vault', code, cursor: 0 }, error: null })
  markAllDirty()
  await syncNow()
}

export function markCodeSaved() {
  if (cloud.group) {
    setCloud({ group: { ...cloud.group, savedAt: Date.now() } })
  }
}

/** Deletes the backup on the server for every phone. This phone keeps its data. */
export async function deleteBackup() {
  const g = cloud.group

  if (!g || g.kind !== 'vault') {
    return
  }

  await api('/api/groups/me', { method: 'DELETE', token: groupToken(g) })
  setCloud({ group: null, error: null })
}

/** A group's invite link; for a backup, its recovery link (the code, not the key). */
export function inviteLink(g: Group) {
  const base = location.href.split('#')[0]

  return `${base}#/join/${g.kind === 'vault' && g.code ? g.code : groupToken(g)}`
}

// ---- sync ------------------------------------------------------------------

const MAX_PUSH = 200 // matches LIMITS.docsPerPush in the worker

type SyncResponse = {
  group: { id: string; name: string; kind: GroupKind }
  cursor: number
  more: boolean
  docs: RemoteDoc[]
}

let inflight: Promise<void> | null = null

/** Push dirty docs, pull everything new. Concurrent calls share one run. */
export function syncNow(): Promise<void> {
  if (!cloudEnabled || !cloud.group) {
    return Promise.resolve()
  }

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

      if (!g) {
        return
      }

      const batch = dirtyDocs().slice(0, MAX_PUSH)
      const res = await api<SyncResponse>('/api/sync', {
        method: 'POST',
        token: groupToken(g),
        body: JSON.stringify({ cursor: g.cursor, docs: batch }),
      })

      // Left, deleted or switched group while the request was out: drop the answer.
      if (cloud.group?.id !== g.id) {
        return
      }

      clearDirty(batch)
      applyRemote(res.docs)
      setCloud({ group: { ...cloud.group, name: res.group.name, kind: res.group.kind, cursor: res.cursor, lastSync: Date.now() } })
      more = res.more || (batch.length === MAX_PUSH && dirtyDocs().length > 0)
    }

    setCloud({ error: null })
  } catch (e) {
    setCloud({ error: e instanceof Error ? e.message : String(e) })
  } finally {
    setCloud({ syncing: false })
  }
}

// ---- live games ------------------------------------------------------------
// A live game is a Room Durable Object (worker/src/room.js). These are the
// plain HTTP calls; the WebSocket side lives in lib/room.ts.

export type LiveHandle = { code: string; token: string }

const liveHandles = (): Record<string, LiveHandle> => readJson(LIVE_KEY, {})

export function liveHandle(sessionId: string): LiveHandle | undefined {
  return liveHandles()[sessionId]
}

export function forgetLive(sessionId: string) {
  const all = liveHandles()

  delete all[sessionId]
  localStorage.setItem(LIVE_KEY, JSON.stringify(all))
}

export function liveLink(code: string) {
  return `${location.href.split('#')[0]}#/live/${code}`
}

export async function startLive(session: Session): Promise<LiveHandle> {
  const h = await api<LiveHandle>('/api/live', { method: 'POST', body: JSON.stringify({ data: { session } }) })

  localStorage.setItem(LIVE_KEY, JSON.stringify({ ...liveHandles(), [session.id]: h }))

  return h
}

/** HTTP push of the whole session — used for the final state as a game ends. */
export async function pushLive(session: Session) {
  const h = liveHandle(session.id)

  if (!h) {
    return
  }

  try {
    await api(`/api/live/${h.code}`, { method: 'PUT', token: h.token, body: JSON.stringify({ data: { session } }) })
  } catch (e) {
    // The room expired or was ended elsewhere: stop trying.
    if (e instanceof Error && /not found/i.test(e.message)) {
      forgetLive(session.id)
    }
  }
}

export async function stopLive(sessionId: string) {
  const h = liveHandle(sessionId)

  forgetLive(sessionId)

  if (h) {
    await api(`/api/live/${h.code}`, { method: 'DELETE', token: h.token }).catch(() => {})
  }
}

export async function fetchLive(code: string) {
  return api<{ data: { session: Session }; updatedAt: number; host: boolean }>(`/api/live/${encodeURIComponent(code)}`)
}
