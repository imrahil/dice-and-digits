import { ArrowDownUp, Flag, LayoutGrid, List, QrCode, Radio, Trash2 } from 'lucide-react'
import { useI18n } from '../../../i18n'
import { cloudEnabled } from '../../../lib/cloud'
import { tableFits } from '../../../lib/store'
import { Button, Segmented, Sheet } from '../../ui'
import { ViewLabel } from '../ViewLabel'
import type { CounterView, Session } from '../../../types'

/** The ⋮ sheet: counter layout, live sharing, finish and discard. */
export function BoardMenu({
  open,
  onClose,
  session,
  view,
  live,
  onPickView,
  onGoLive,
  onEndLive,
  onFinish,
  onDiscard,
}: {
  open: boolean
  onClose: () => void
  session: Session
  /** Counter games only: the current layout. */
  view?: CounterView
  live: boolean
  onPickView: (view: CounterView) => void
  onGoLive: () => void
  onEndLive: () => void
  onFinish: () => void
  onDiscard: () => void
}) {
  const { t, text } = useI18n()

  return (
    <Sheet open={open} onClose={onClose} title={text(session.rules.name)}>
      {view && (
        <div className="mb-4">
          <h3 className="mb-2 px-1 text-xs font-extrabold tracking-wide text-ink/50 uppercase dark:text-white/50">{t('view')}</h3>
          <Segmented
            value={view}
            onChange={onPickView}
            options={[
              { value: 'list', label: <ViewLabel icon={<List className="size-4" />} label={t('viewList')} /> },
              { value: 'grid', label: <ViewLabel icon={<LayoutGrid className="size-4" />} label={t('viewGrid')} /> },
              {
                value: 'table',
                label: <ViewLabel icon={<ArrowDownUp className="size-4" />} label={t('viewTable')} />,
                disabled: !tableFits(session),
              },
            ]}
          />
        </div>
      )}
      <div className="space-y-2">
        {cloudEnabled && (
          <>
            <Button className="w-full !justify-start" onClick={onGoLive}>
              {live ? <QrCode className="size-5" /> : <Radio className="size-5" />}
              {live ? t('liveSharing') : t('liveShare')}
            </Button>
            {live && (
              <Button variant="ghost" className="w-full !justify-start" onClick={onEndLive}>
                <Radio className="size-5" /> {t('liveStop')}
              </Button>
            )}
            <p className="px-1 pb-2 text-sm text-ink/55 dark:text-white/55">{t('liveHint')}</p>
          </>
        )}
        <Button className="w-full !justify-start" onClick={onFinish}>
          <Flag className="size-5" /> {t('finishGame')}
        </Button>
        <Button variant="danger" className="w-full !justify-start" onClick={onDiscard}>
          <Trash2 className="size-5" /> {t('abandonGame')}
        </Button>
      </div>
    </Sheet>
  )
}
