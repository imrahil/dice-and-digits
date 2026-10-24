import { useI18n } from '../i18n'
import { cloudEnabled } from '../lib/cloud'
import { Empty, Page } from '../components/ui'
import { LiveRoom } from '../components/live/LiveRoom'

/**
 * A friend's phone following a live game (opened from the QR code). Watching
 * by default; after picking a seat it becomes a scorer for that one player.
 */
export function Live({ code }: { code: string }) {
  const { t } = useI18n()

  if (!cloudEnabled) {
    return (
      <Page title={t('liveTitle')} back="">
        <Empty icon="📡">{t('cloudUnavailable')}</Empty>
      </Page>
    )
  }

  return <LiveRoom key={code} code={code.toUpperCase()} />
}
