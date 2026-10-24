import { useI18n } from '../../i18n'
import { standings } from '../../lib/scoring'
import { Podium } from '../result/Podium'
import { Watch } from './Watch'
import type { Session } from '../../types'

export function Final({ session }: { session: Session }) {
  const { t } = useI18n()

  return (
    <>
      <p className="px-1 text-sm font-semibold text-ink/55 dark:text-white/55">{t('liveFinished')}</p>
      {session.seats.length > 1 && <Podium table={standings(session)} />}
      <Watch session={session} />
    </>
  )
}
