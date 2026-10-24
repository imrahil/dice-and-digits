import { useState } from 'react'
import { forgetLive, liveHandle, startLive, stopLive } from '../lib/cloud'
import { useLiveHost } from './useLiveHost'
import type { Session } from '../types'

/**
 * Sharing a game live from the scorekeeper's phone: the room handle, the
 * room's status while hosting, and whether the QR sheet is showing.
 */
export function useLiveShare(session: Session) {
  const [live, setLive] = useState(() => liveHandle(session.id))
  const [qr, setQr] = useState(false)

  // While live, this phone is the room's host: it applies players' ops and mirrors every change.
  const room = useLiveHost(session, live, () => {
    forgetLive(session.id)
    setLive(undefined)
    setQr(false)
  })

  /** Opens the room if needed and shows its QR code. Throws when the room can't be opened. */
  const start = async () => {
    if (!live) {
      setLive(await startLive(session))
    }

    setQr(true)
  }

  const stop = async () => {
    await stopLive(session.id)
    setLive(undefined)
    setQr(false)
  }

  return { live, room, qr, showQr: () => setQr(true), hideQr: () => setQr(false), start, stop }
}
