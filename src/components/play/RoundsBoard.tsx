import { useI18n } from '../../i18n'
import type { Scorer } from '../../lib/scorer'
import { RoundEntry } from './rounds/RoundEntry'
import { RoundsTable } from './rounds/RoundsTable'
import { StandingCards } from './rounds/StandingCards'
import type { Session } from '../../types'

export function RoundsBoard({
  session,
  scorer,
  entry,
  setEntry,
}: {
  session: Session
  scorer: Scorer
  entry: number | null
  setEntry: (i: number | null) => void
}) {
  const { t } = useI18n()

  return (
    <>
      <StandingCards session={session} />
      {session.rounds.length > 0 ? (
        <div className="mt-4">
          <RoundsTable session={session} onRow={setEntry} compact highlightLast />
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-ink/55 dark:text-white/55">{t('noRoundsYet')}</p>
      )}
      {entry !== null && <RoundEntry key={entry} session={session} scorer={scorer} index={entry} onClose={() => setEntry(null)} />}
    </>
  )
}
