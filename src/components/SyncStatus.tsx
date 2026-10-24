import { Cloud, RefreshCw } from 'lucide-react'
import { useI18n } from '../i18n'
import { syncNow, useCloud, type Group } from '../lib/cloud'
import { Button, cx } from './ui'

/** Group name, last sync or error, and a sync button. */
export function SyncStatus({ group }: { group: Group }) {
  const { t, ago } = useI18n()
  const { syncing, error } = useCloud()

  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-mint/15 text-mint">
        <Cloud className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-extrabold">{group.name}</span>
        <span className={cx('block text-sm', error ? 'text-danger' : 'text-ink/55 dark:text-white/55')}>
          {syncing
            ? t('syncing')
            : error
              ? t('syncError', { error })
              : group.lastSync
                ? t('lastSync', { time: ago(group.lastSync) })
                : t('neverSynced')}
        </span>
      </span>
      <Button size="sm" variant="ghost" onClick={() => syncNow()} disabled={syncing} aria-label={t('syncNow')}>
        <RefreshCw className={cx('size-5', syncing && 'animate-spin')} />
      </Button>
    </div>
  )
}
