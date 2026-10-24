import { useI18n } from '../../i18n'
import { Card, Toggle, cx, inputClass } from '../ui'
import { RoundTimerOptions } from './RoundTimerOptions'
import type { EditorFields } from '../../lib/games'
import type { GameDef } from '../../types'

/** The options that apply to the chosen mode: lowest wins, zero-sum, target, round timer, quick buttons. */
export function EditorOptions({
  game: g,
  onPatch,
  fields,
  onField,
}: {
  game: GameDef
  onPatch: (patch: Partial<GameDef>) => void
  fields: EditorFields
  onField: (field: keyof EditorFields, value: string) => void
}) {
  const { t } = useI18n()

  return (
    <Card className="!py-2">
      <Toggle checked={g.lowWins} onChange={(lowWins) => onPatch({ lowWins })} label={t('lowestWins')} />
      {g.mode === 'rounds' && (
        <div className="border-t border-edge dark:border-white/8">
          <Toggle checked={!!g.zeroSum} onChange={(zeroSum) => onPatch({ zeroSum })} label={t('zeroSum')} hint={t('zeroSumHint')} />
        </div>
      )}
      <label className="flex items-center gap-3 border-t border-edge py-3 dark:border-white/8">
        <span className="flex-1 font-semibold">{t('targetScore')}</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          className={cx(inputClass, '!w-28 text-right')}
          value={fields.target}
          onChange={(e) => onField('target', e.target.value)}
          placeholder="—"
        />
      </label>
      {g.mode === 'winner' && <RoundTimerOptions timer={g.timer} onTimer={(timer) => onPatch({ timer })} fields={fields} onField={onField} />}
      {g.mode === 'counter' && (
        <label className="block border-t border-edge py-3 dark:border-white/8">
          <span className="block font-semibold">{t('quickButtons')}</span>
          <span className="mb-2 block text-sm text-ink/55 dark:text-white/55">{t('quickButtonsHint')}</span>
          <input className={inputClass} value={fields.steps} onChange={(e) => onField('steps', e.target.value)} inputMode="numeric" />
        </label>
      )}
    </Card>
  )
}
