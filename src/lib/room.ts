import { API_URL } from './cloud'
import type { Op } from './ops'
import type { Session } from '../types'

/** Messages the Room Durable Object sends (protocol: worker/src/room.js). */
export type ServerMsg =
  | { t: 'welcome'; role: 'host' | 'guest'; seat: string | null }
  | { t: 'state'; session: Session; updatedAt: number }
  | { t: 'room'; seats: Record<string, true>; host: boolean; guests: number }
  | { t: 'ops'; ops: Op[] }
  | { t: 'claimed'; seat: string; guest: string | null }
  | { t: 'rejected'; ids: string[] }
  | { t: 'error'; code: string; id?: string }
  | { t: 'ended' }

export type SocketStatus = 'connecting' | 'open' | 'offline' | 'ended'

const BACKOFF_MS = [500, 1000, 2000, 4000, 8000]

export const wsUrl = (code: string) => `${API_URL.replace(/^http/, 'ws')}/api/live/${encodeURIComponent(code)}/ws`

/**
 * A WebSocket to one room that keeps itself connected: backoff on failure,
 * an immediate retry when the phone comes back online or the app comes back
 * to the foreground (mobile browsers kill sockets in the background).
 * `hello()` is sent first on every (re)connect.
 */
export class RoomSocket {
  private ws: WebSocket | null = null
  private attempt = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private stopped = false
  private readonly code: string
  private readonly hello: () => object
  private readonly onMessage: (m: ServerMsg) => void
  private readonly onStatus: (s: SocketStatus, failures: number) => void

  constructor(code: string, hello: () => object, onMessage: (m: ServerMsg) => void, onStatus: (s: SocketStatus, failures: number) => void) {
    this.code = code
    this.hello = hello
    this.onMessage = onMessage
    this.onStatus = onStatus
  }

  start() {
    window.addEventListener('online', this.retryNow)
    document.addEventListener('visibilitychange', this.onVisible)
    this.connect()

    return this
  }

  stop() {
    this.stopped = true
    clearTimeout(this.timer)
    window.removeEventListener('online', this.retryNow)
    document.removeEventListener('visibilitychange', this.onVisible)
    this.ws?.close(1000)
    this.ws = null
  }

  /** False when not connected — callers keep the message and resend on reconnect. */
  send(msg: object): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return false
    }

    this.ws.send(JSON.stringify(msg))

    return true
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible') {
      this.retryNow()
    }
  }

  private retryNow = () => {
    if (this.stopped || this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return
    }

    clearTimeout(this.timer)
    this.connect()
  }

  private connect() {
    if (this.stopped) {
      return
    }

    this.onStatus('connecting', this.attempt)
    const ws = new WebSocket(wsUrl(this.code))

    this.ws = ws

    ws.onopen = () => {
      this.attempt = 0
      ws.send(JSON.stringify({ t: 'hello', ...this.hello() }))
      this.onStatus('open', 0)
    }

    ws.onmessage = (e) => {
      let msg: ServerMsg

      try {
        msg = JSON.parse(e.data)
      } catch {
        return
      }

      if (msg.t === 'ended') {
        this.stopped = true
        this.onStatus('ended', 0)
      }

      this.onMessage(msg)
    }

    ws.onclose = (e) => {
      if (this.ws !== ws) {
        return
      }

      this.ws = null

      if (e.code === 4404) {
        this.stopped = true
        this.onStatus('ended', 0)

        return
      }

      if (this.stopped) {
        return
      }

      this.attempt++
      this.onStatus('offline', this.attempt)
      this.timer = setTimeout(() => this.connect(), BACKOFF_MS[Math.min(this.attempt - 1, BACKOFF_MS.length - 1)])
    }
  }
}
