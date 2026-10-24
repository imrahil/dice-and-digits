import { Loader2 } from 'lucide-react'
import { useI18n } from '../../i18n'
import type { RoomView } from '../../hooks/useRoom'

export function StatusPill({ room }: { room: RoomView }) {
  const { t } = useI18n()

  if (room.status === 'open') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-danger px-2.5 py-1 text-xs font-black text-white">
        <span className="size-1.5 animate-pulse rounded-full bg-white" /> LIVE
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-ink/10 px-2.5 py-1 text-xs font-bold dark:bg-white/10">
      <Loader2 className="size-3 animate-spin" />
      {room.status === 'loading' || room.status === 'connecting' ? t('connecting') : t('reconnecting')}
    </span>
  )
}
