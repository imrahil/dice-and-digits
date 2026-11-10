import { useSyncExternalStore } from 'react'
import { api, appLink, cloudEnabled } from './api'
import { applyRemote, clearDirty, dirtyDocs, markAllDirty, setPersonalSync, type RemoteDoc } from './store'
import { deriveKey, newCode, type Code } from './recovery'
import { readJson, writeJson } from './storage'

const GROUP_KEY = 'group'

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

let cloud: CloudState = { group: readJson<Group | null>(GROUP_KEY, null), syncing: false, error: null }
const listeners = new Set<() => void>()

// My shelf travels to a personal backup only, never to a shared group.
setPersonalSync(cloud.group?.kind === 'vault')

function setCloud(patch: Partial<CloudState>) {
  cloud = { ...cloud, ...patch }

  if ('group' in patch) {
    writeJson(GROUP_KEY, cloud.group)
    setPersonalSync(cloud.group?.kind === 'vault')
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

const groupToken = (g: Pick<Group, 'id' | 'secret'>) => `${g.id}.${g.secret}`

// ---- groups ----------------------------------------------------------------

/** This phone is now in `group`: offer it everything shareable, then pull what it holds. */
async function enter(group: Group) {
  setCloud({ group, error: null })
  markAllDirty()
  await syncNow()
}

export async function createGroup(name: string) {
  const g = await api<{ id: string; secret: string; name: string; kind: GroupKind }>('/api/groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

  await enter({ ...g, cursor: 0 })
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

  await enter({ id: info.id, secret: token.slice(dot + 1), name: info.name, kind: info.kind, code, savedAt, cursor: 0 })
}

export function leaveGroup() {
  setCloud({ group: null, error: null })
}

// ---- personal backup ---------------------------------------------------------
// A vault is a group of one. Its id and secret are stretched from six recovery
// words on the phone (recovery.ts), so the words alone restore it.

/** The group token a recovery code opens. Slow on purpose (PBKDF2). */
export async function backupToken(code: Code): Promise<string> {
  return groupToken(await deriveKey(code))
}

export async function createBackup(name: string) {
  const code = newCode()
  const { id, secret } = await deriveKey(code)

  await api('/api/groups', { method: 'POST', body: JSON.stringify({ name, kind: 'vault', id, secret }) })
  await enter({ id, secret, name, kind: 'vault', code, cursor: 0 })
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
  return appLink(`join/${g.kind === 'vault' && g.code ? g.code : groupToken(g)}`)
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
