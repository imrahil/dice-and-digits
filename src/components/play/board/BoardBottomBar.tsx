import { Flag, Pause, Play as PlayIcon, Plus } from 'lucide-react'
import { useI18n } from '../../../i18n'
import { nextRound } from '../../../lib/ops'
import { BottomBar, Button } from '../../ui'
import type { HotPotatoRound } from '../../../hooks/useHotPotatoRound'
import type { Session } from '../../../types'

/** The primary action for each mode: run the round clock, add a round, or just finish. */
export function BoardBottomBar({
  session,
  round,
  onFinish,
  onNewRound,
}: {
  session: Session
  round: HotPotatoRound
  onFinish: () => void
  onNewRound: (index: number) => void
}) {
  const { t } = useI18n()
  const { mode } = session.rules
  const timer = mode === 'winner' ? session.rules.timer : undefined

  const finishIcon = (
    <Button size="lg" onClick={onFinish} aria-label={t('finishGame')} className="shrink-0 !px-4">
      <Flag className="size-5" />
    </Button>
  )

  if (timer) {
    return (
      <BottomBar>
        {finishIcon}
        {round.phase === 'idle' && (
          <Button variant="primary" size="lg" className="flex-1" onClick={round.start}>
            <PlayIcon className="size-5" strokeWidth={2.5} /> {t('potatoStart', { n: session.rounds.length + 1 })}
          </Button>
        )}
        {round.phase === 'running' && (
          <Button size="lg" className="flex-1" onClick={round.reset}>
            <Pause className="size-5" strokeWidth={2.5} /> {t('potatoStop')}
          </Button>
        )}
        {round.phase === 'boom' && (
          <Button size="lg" className="flex-1" onClick={round.reset}>
            {t('potatoSkip')}
          </Button>
        )}
      </BottomBar>
    )
  }

  if (mode === 'rounds') {
    const next = nextRound(session)

    return (
      <BottomBar>
        {finishIcon}
        <Button variant="primary" size="lg" className="flex-1" onClick={() => onNewRound(next)}>
          <Plus className="size-6" strokeWidth={3} /> {t('roundN', { n: next + 1 })}
        </Button>
      </BottomBar>
    )
  }

  return (
    <BottomBar>
      <Button variant="primary" size="lg" className="flex-1" onClick={onFinish}>
        <Flag className="size-5" strokeWidth={2.5} /> {t('finishGame')}
      </Button>
    </BottomBar>
  )
}
