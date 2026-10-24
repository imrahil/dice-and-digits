import { useRegisterSW } from 'virtual:pwa-register/react'
import { useI18n } from '../../i18n'
import { Button } from '../ui'

export function UpdateBanner() {
  const { t } = useI18n()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) {
    return null
  }

  return (
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[70] flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-2xl bg-ink py-2 pr-2 pl-4 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-ink">
        {t('updateReady')}
        <Button size="sm" variant="primary" onClick={() => updateServiceWorker(true)}>
          {t('reload')}
        </Button>
      </div>
    </div>
  )
}
