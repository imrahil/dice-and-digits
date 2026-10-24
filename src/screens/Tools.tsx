import { useI18n } from '../i18n'
import { navigate } from '../hooks/useRoute'
import { Page, Segmented } from '../components/ui'
import { Dice } from '../components/tools/Dice'
import { FingerPicker } from '../components/tools/FingerPicker'
import { Timer } from '../components/tools/Timer'

type Tab = 'dice' | 'picker' | 'timer'

export function Tools({ tab }: { tab?: string }) {
  const { t } = useI18n()
  const active: Tab = tab === 'picker' || tab === 'timer' ? tab : 'dice'

  return (
    <Page title={t('navTools')}>
      <Segmented
        value={active}
        onChange={(v) => navigate(`tools/${v}`, { replace: true })}
        options={[
          { value: 'dice', label: `🎲 ${t('dice')}` },
          { value: 'picker', label: `👆 ${t('picker')}` },
          { value: 'timer', label: `⏳ ${t('timer')}` },
        ]}
      />
      <div className="mt-4">
        {active === 'dice' && <Dice />}
        {active === 'picker' && <FingerPicker />}
        {active === 'timer' && <Timer />}
      </div>
    </Page>
  )
}
