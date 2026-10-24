import { Smartphone } from 'lucide-react'
import { useI18n } from '../../../i18n'
import { cx } from '../../ui'
import type { HostRoom } from '../../../hooks/useLiveHost'

/** The red LIVE pill in the header: pulses while connected, counts joined phones, opens the QR sheet. */
export function LiveBadge({ room, onClick }: { room: HostRoom; onClick: () => void }) {
  const { t } = useI18n()

  return (
    <button
      onClick={onClick}
      className={cx(
        'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black text-white',
        room.status === 'open' ? 'bg-danger' : 'bg-ink/40 dark:bg-white/25',
      )}
      aria-label={t('liveSharing')}
    >
      <span className={cx('size-1.5 rounded-full bg-white', room.status === 'open' && 'animate-pulse')} /> LIVE
      {room.guests > 0 && (
        <span className="ml-0.5 flex items-center gap-0.5">
          <Smartphone className="size-3" strokeWidth={3} />
          {room.guests}
        </span>
      )}
    </button>
  )
}
