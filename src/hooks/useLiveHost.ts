import { useCallback, useEffect, useRef, useState } from 'react'
import { applyRemote } from '../lib/ops'
import { RoomSocket, type ServerMsg, type SocketStatus } from '../lib/room'
import { updateSession } from '../lib/store'
import type { Session } from '../types'

export type HostRoom = {
  status: SocketStatus
  /** Seats claimed by players on their own phones. */
  seats: Record<string, true>
  /** Phones connected besides this one (players and viewers). */
  guests: number
  release: (seat: string) => void
}

/**
 * The host side of a live game. This phone stays the source of truth: it
 * applies ops from joined players to its own store (idempotently, via
 * session.ops), acks them, and mirrors every change of the session to the
 * room. While offline it keeps scoring; the room queues players' ops and
 * hands them over on reconnect.
 */
export function useLiveHost(session: Session, live: { code: string; token: string } | undefined, onEnded: () => void): HostRoom {
  const [status, setStatus] = useState<SocketStatus>('connecting')
  const [room, setRoom] = useState<{ seats: Record<string, true>; guests: number }>({ seats: {}, guests: 0 })
  const socket = useRef<RoomSocket | null>(null)
  const latest = useRef(session)

  latest.current = session
  const ended = useRef(onEnded)

  ended.current = onEnded

  const sessionId = session.id
  const code = live?.code
  const token = live?.token

  useEffect(() => {
    if (!code || !token) {
      return
    }

    const onMessage = (m: ServerMsg) => {
      switch (m.t) {
        case 'welcome':
          // (Re)connected: the room may hold an older snapshot than ours.
          socket.current?.send({ t: 'state', session: latest.current })
          break

        case 'ops': {
          const out: { r?: ReturnType<typeof applyRemote> } = {}

          updateSession(sessionId, (s) => {
            out.r = applyRemote(s, m.ops)

            return out.r.session
          })

          if (out.r) {
            socket.current?.send({ t: 'ack', applied: out.r.applied, rejected: out.r.rejected })
          }

          break
        }

        case 'room':
          setRoom({ seats: m.seats, guests: m.guests })
          break
        case 'error':
          if (m.code === 'not-host') {
            ended.current()
          }

          break
        case 'ended':
          ended.current()
          break
      }
    }

    const s = new RoomSocket(code, () => ({ host: token }), onMessage, (st) => {
      setStatus(st)

      if (st === 'ended') {
        ended.current()
      }
    }).start()

    socket.current = s

    return () => {
      s.stop()
      socket.current = null
    }
  }, [code, token, sessionId])

  // Mirror the session to the room, lightly debounced so a burst of taps is one frame.
  useEffect(() => {
    if (!code) {
      return
    }

    const id = setTimeout(() => socket.current?.send({ t: 'state', session }), 150)

    return () => clearTimeout(id)
  }, [session, code])

  const release = useCallback((seat: string) => socket.current?.send({ t: 'release', seat }), [])

  return { status, seats: room.seats, guests: room.guests, release }
}
