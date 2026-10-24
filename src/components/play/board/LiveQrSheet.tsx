import { useI18n } from '../../../i18n'
import { liveLink, type LiveHandle } from '../../../lib/cloud'
import { QrShareSheet } from '../../QrShareSheet'
import { JoinedSeats } from '../JoinedSeats'
import type { HostRoom } from '../../../hooks/useLiveHost'
import type { Session } from '../../../types'

/** The live game's QR code and code, with who has joined and a stop button. */
export function LiveQrSheet({
  session,
  live,
  room,
  open,
  onClose,
  onStop,
}: {
  session: Session
  live: LiveHandle
  room: HostRoom
  open: boolean
  onClose: () => void
  onStop: () => void
}) {
  const { t, text } = useI18n()

  return (
    <QrShareSheet
      open={open}
      onClose={onClose}
      title={`${session.emoji} ${text(session.rules.name)}`}
      caption={t('scanToFollow')}
      url={liveLink(live.code)}
      code={live.code}
    >
      <JoinedSeats session={session} room={room} onStop={onStop} />
    </QrShareSheet>
  )
}
