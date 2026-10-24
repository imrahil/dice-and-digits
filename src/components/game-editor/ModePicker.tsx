import { useI18n } from '../../i18n'
import { Segmented } from '../ui'
import type { ScoringMode } from '../../types'

/** The four scoring modes, with a line on how the chosen one works. */
export function ModePicker({ value, onChange }: { value: ScoringMode; onChange: (mode: ScoringMode) => void }) {
  const { t } = useI18n()
  const modes: { value: ScoringMode; label: string }[] = [
    { value: 'counter', label: t('modeCounter') },
    { value: 'rounds', label: t('modeRounds') },
    { value: 'sheet', label: t('modeSheet') },
    { value: 'winner', label: t('modeWinner') },
  ]
  const hint = { counter: t('modeCounterHint'), rounds: t('modeRoundsHint'), sheet: t('modeSheetHint'), winner: t('modeWinnerHint') }[value]

  return (
    <>
      <Segmented grid value={value} onChange={onChange} options={modes} />
      <p className="mt-2 px-1 text-sm text-ink/60 dark:text-white/60">{hint}</p>
    </>
  )
}
