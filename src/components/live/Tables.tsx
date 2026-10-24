import { useI18n } from '../../i18n'
import { RoundsTable } from '../play/rounds/RoundsTable'
import { SheetTable } from '../play/sheet/SheetTable'
import { Section } from '../ui'
import type { Session } from '../../types'

export function Tables({ session }: { session: Session }) {
  const { t } = useI18n()

  if ((session.rules.mode === 'rounds' || session.rules.mode === 'winner') && session.rounds.length > 0) {
    return (
      <Section title={t('modeRounds')}>
        <RoundsTable session={session} />
      </Section>
    )
  }

  if (session.rules.mode === 'sheet') {
    return (
      <Section title={t('modeSheet')}>
        <SheetTable session={session} />
      </Section>
    )
  }

  return null
}
