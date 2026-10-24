import { useI18n } from '../../i18n'
import { Toggle, cx, inputClass } from '../ui'
import type { EditorFields } from '../../lib/games'
import type { RoundTimer } from '../../types'

/** Winner mode's Hot Potato clock: on/off, hidden or shown, and its random range. */
export function RoundTimerOptions({
  timer,
  onTimer,
  fields,
  onField,
}: {
  timer?: RoundTimer
  onTimer: (timer: RoundTimer | undefined) => void
  fields: EditorFields
  onField: (field: keyof EditorFields, value: string) => void
}) {
  const { t } = useI18n()

  return (
    <>
      <div className="border-t border-edge dark:border-white/8">
        <Toggle
          checked={!!timer}
          onChange={(on) => onTimer(on ? { hidden: true, min: 10, max: 30 } : undefined)}
          label={t('roundTimer')}
          hint={t('roundTimerHint')}
        />
      </div>
      {timer && (
        <>
          <div className="border-t border-edge dark:border-white/8">
            <Toggle checked={timer.hidden} onChange={(hidden) => onTimer({ ...timer, hidden })} label={t('timerHidden')} hint={t('timerHiddenHint')} />
          </div>
          <div className="flex items-center gap-2 border-t border-edge py-3 dark:border-white/8">
            <span className="flex-1 font-semibold">{t('timerRange')}</span>
            <input
              type="number"
              inputMode="numeric"
              min={3}
              aria-label="min"
              className={cx(inputClass, '!w-20 text-right')}
              value={fields.timerMin}
              onChange={(e) => onField('timerMin', e.target.value)}
            />
            <span className="font-bold text-ink/50 dark:text-white/50">–</span>
            <input
              type="number"
              inputMode="numeric"
              min={3}
              aria-label="max"
              className={cx(inputClass, '!w-20 text-right')}
              value={fields.timerMax}
              onChange={(e) => onField('timerMax', e.target.value)}
            />
          </div>
        </>
      )}
    </>
  )
}
