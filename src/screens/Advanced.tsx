import { useI18n } from '../i18n'
import { cloudEnabled } from '../lib/cloud'
import { BackupSection } from '../components/advanced/BackupSection'
import { FileSection } from '../components/advanced/FileSection'
import { GroupSection } from '../components/advanced/GroupSection'
import { Page } from '../components/ui'

/** Keeping data safe and sharing it: none of it is needed to keep score. */
export function Advanced() {
  const { t } = useI18n()

  return (
    <Page title={t('advanced')} back="more">
      <p className="px-1 text-sm text-ink/65 dark:text-white/65">{t('advancedIntro')}</p>
      {cloudEnabled && <BackupSection />}
      {cloudEnabled && <GroupSection />}
      <FileSection />
    </Page>
  )
}
