import { ArrowDownWideNarrow, ListOrdered, Repeat, Target, Tally5, Trophy } from 'lucide-react'
import { useI18n } from '../i18n'
import type { ScoringMode } from '../types'

const ICON = { counter: Tally5, rounds: Repeat, sheet: ListOrdered, winner: Trophy }

export const MODE_LABEL = { counter: 'modeCounter', rounds: 'modeRounds', sheet: 'modeSheet', winner: 'modeWinner' } as const

export function ModeBadge({ mode, target, lowWins }: { mode: ScoringMode; target?: number; lowWins?: boolean }) {
  const { t, num } = useI18n()
  const Icon = ICON[mode]

  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-semibold text-ink/55 dark:text-white/55">
      <span className="inline-flex items-center gap-1">
        <Icon className="size-3.5" /> {t(MODE_LABEL[mode])}
      </span>
      {target ? (
        <span className="inline-flex items-center gap-1">
          <Target className="size-3.5" /> {num(target)}
        </span>
      ) : null}
      {lowWins && (
        <span className="inline-flex items-center gap-1">
          <ArrowDownWideNarrow className="size-3.5" /> {mode === 'winner' ? t('countsLosses') : t('lowestWins')}
        </span>
      )}
    </span>
  )
}
