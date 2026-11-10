import type { Session } from '../types'
import { api, appLink, isNotFound } from './api'
import { readJson, writeJson } from './storage'

/**
 * A live game is a Room Durable Object (worker/src/room.js). These are the
 * plain HTTP calls; the WebSocket side lives in lib/room.ts.
 */

const LIVE_KEY = 'live'

/** What the host phone keeps to run a room: its code and the host token. */
export type LiveHandle = { code: string; token: string }

const liveHandles = (): Record<string, LiveHandle> => readJson(LIVE_KEY, {})

export function liveHandle(sessionId: string): LiveHandle | undefined {
  return liveHandles()[sessionId]
}

export function forgetLive(sessionId: string) {
  const all = liveHandles()

  delete all[sessionId]
  writeJson(LIVE_KEY, all)
}

export const liveLink = (code: string) => appLink(`live/${code}`)

export async function startLive(session: Session): Promise<LiveHandle> {
  const h = await api<LiveHandle>('/api/live', { method: 'POST', body: JSON.stringify({ data: { session } }) })

  writeJson(LIVE_KEY, { ...liveHandles(), [session.id]: h })

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
    if (isNotFound(e)) {
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
