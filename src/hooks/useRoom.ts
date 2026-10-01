import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchLive } from '../lib/cloud'
import { applyOp, type Op, type OpBody } from '../lib/ops'
import { RoomSocket, type ServerMsg, type SocketStatus } from '../lib/room'
import type { Scorer } from '../lib/scorer'
import { uid } from '../lib/store'
import type { Session } from '../types'

const KEY = (code: string) => `dice-digits:guest:${code}`

type Saved = { token?: string; pending: Op[] }

function load(code: string): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(code)) ?? 'null')
    return v && Array.isArray(v.pending) ? v : { pending: [] }
  } catch {
    return { pending: [] }
  }
}

function save(code: string, v: Saved) {
  try {
    localStorage.setItem(KEY(code), JSON.stringify(v))
  } catch {
    // storage full or blocked: the ops still go out while the tab is open
  }
}

export type RoomView = {
  status: SocketStatus | 'loading' | 'notfound'
  /** The host's latest session with this phone's not-yet-applied ops on top. */
  session: Session | null
  updatedAt: number
  hostOnline: boolean
  seats: Record<string, true>
  mySeat: string | null
  pending: number
  /** Last problem worth telling the user about (seat taken, entry rejected). */
  notice: { code: string; at: number } | null
  claim: (seat: string) => void
  leave: () => void
  scorer: Scorer
}

/**
 * A phone following a live game: watching by default, scoring for one seat
 * after `claim()`. Ops are shown immediately (optimistically), kept in
 * localStorage until the host has applied them, and resent after a reconnect —
 * the room and the host both de-duplicate by op id.
 */
export function useRoom(code: string): RoomView {
  const [status, setStatus] = useState<RoomView['status']>('loading')
  const [base, setBase] = useState<{ session: Session; updatedAt: number } | null>(null)
  const [room, setRoom] = useState<{ seats: Record<string, true>; host: boolean }>({ seats: {}, host: false })
  const [mySeat, setMySeat] = useState<string | null>(null)
  const [saved, setSaved] = useState<Saved>(() => load(code))
  const [notice, setNotice] = useState<RoomView['notice']>(null)
  const socket = useRef<RoomSocket | null>(null)
  const savedRef = useRef(saved)

  const persist = useCallback(
    (fn: (s: Saved) => Saved) => {
      const next = fn(savedRef.current)
      savedRef.current = next
      save(code, next)
      setSaved(next)
    },
    [code],
  )

  useEffect(() => {
    let stopped = false
    let socketStarted = false

    const onMessage = (m: ServerMsg) => {
      switch (m.t) {
        case 'welcome':
          setMySeat(m.seat)
          // Resend anything the host hasn't acknowledged yet.
          if (m.seat) for (const op of savedRef.current.pending) if (op.p === m.seat) socket.current?.send({ t: 'op', op })
          break
        case 'state': {
          setBase({ session: m.session, updatedAt: m.updatedAt })
          const done = new Set(m.session.ops ?? [])
          if (savedRef.current.pending.some((o) => done.has(o.id))) persist((s) => ({ ...s, pending: s.pending.filter((o) => !done.has(o.id)) }))
          break
        }
        case 'room':
          setRoom({ seats: m.seats, host: m.host })
          break
        case 'claimed':
          setMySeat(m.seat)
          if (m.guest) persist((s) => ({ ...s, token: m.guest! }))
          break
        case 'rejected': {
          const mine = savedRef.current.pending.filter((o) => m.ids.includes(o.id))
          if (mine.length) {
            persist((s) => ({ ...s, pending: s.pending.filter((o) => !m.ids.includes(o.id)) }))
            setNotice({ code: 'rejected', at: Date.now() })
          }
          break
        }
        case 'error':
          if (m.id) persist((s) => ({ ...s, pending: s.pending.filter((o) => o.id !== m.id) }))
          if (m.code === 'taken' || m.code === 'finished' || m.code === 'full') setNotice({ code: m.code, at: Date.now() })
          break
        case 'ended':
          setStatus('ended')
          break
      }
    }

    const startSocket = () => {
      if (socketStarted || stopped) return
      socketStarted = true
      socket.current = new RoomSocket(code, () => ({ guest: savedRef.current.token }), onMessage, (st, failures) => {
        setStatus(st)
        // Repeated failures: check whether the game still exists at all.
        if (st === 'offline' && failures === 3) {
          fetchLive(code).catch((e) => {
            if (e instanceof Error && /not found/i.test(e.message)) {
              socket.current?.stop()
              setStatus('ended')
            }
          })
        }
      }).start()
    }

    // One plain GET first: instant first paint, and a clean "not found".
    fetchLive(code)
      .then((r) => {
        if (stopped) return
        setBase({ session: r.data.session, updatedAt: r.updatedAt })
        setRoom((x) => ({ ...x, host: r.host }))
        if (!r.data.session.finishedAt) startSocket()
        else setStatus('ended')
      })
      .catch((e) => {
        if (stopped) return
        if (e instanceof Error && /not found/i.test(e.message)) setStatus('notfound')
        else startSocket() // offline or flaky: let the socket keep trying
      })

    return () => {
      stopped = true
      socket.current?.stop()
      socket.current = null
    }
  }, [code, persist])

  const claim = useCallback((seat: string) => socket.current?.send({ t: 'claim', seat }), [])
  const leave = useCallback(() => {
    socket.current?.send({ t: 'leave' })
    setMySeat(null)
  }, [])

  const sendOps = useCallback(
    (bodies: OpBody[]) => {
      const ops: Op[] = bodies.map((b) => ({ ...b, id: uid().replace(/-/g, '').slice(0, 20), at: Date.now() }))
      persist((s) => ({ ...s, pending: [...s.pending, ...ops] }))
      for (const op of ops) socket.current?.send({ t: 'op', op })
    },
    [persist],
  )

  const scorer = useMemo<Scorer>(() => ({ canEdit: (id) => id === mySeat, apply: sendOps }), [mySeat, sendOps])

  // Optimistic view: this phone's own pending ops on top of the host's state.
  const session = useMemo(() => {
    if (!base) return null
    const done = new Set(base.session.ops ?? [])
    return saved.pending.filter((o) => !done.has(o.id)).reduce((s, op) => applyOp(s, op) ?? s, base.session)
  }, [base, saved.pending])

  return {
    status,
    session,
    updatedAt: base?.updatedAt ?? 0,
    hostOnline: room.host,
    seats: room.seats,
    mySeat,
    pending: saved.pending.length,
    notice,
    claim,
    leave,
    scorer,
  }
}
