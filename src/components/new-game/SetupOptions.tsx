import { useI18n } from '../../i18n'
import { Card, Toggle, cx, inputClass } from '../ui'

/** Per-game overrides for this session: lowest wins, target score and pawn colours. */
export function SetupOptions({
  lowWins,
  onLowWins,
  timed,
  target,
  onTarget,
  usePawns,
  onUsePawns,
}: {
  lowWins: boolean
  onLowWins: (on: boolean) => void
  timed: boolean
  target: string
  onTarget: (value: string) => void
  usePawns: boolean
  onUsePawns: (on: boolean) => void
}) {
  const { t } = useI18n()

  return (
    <Card className="!py-2">
      <Toggle checked={lowWins} onChange={onLowWins} label={t('lowestWins')} hint={timed ? t('timerLowWinsHint') : undefined} />
      <label className="flex items-center gap-3 border-t border-edge py-3 dark:border-white/8">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{t('targetScore')}</span>
          <span className="block text-sm text-ink/55 dark:text-white/55">{t('targetHint')}</span>
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          className={cx(inputClass, '!w-28 text-right tabular-nums')}
          value={target}
          onChange={(e) => onTarget(e.target.value)}
          placeholder="—"
        />
      </label>
      <div className="border-t border-edge dark:border-white/8">
        <Toggle checked={usePawns} onChange={onUsePawns} label={t('pawnColours')} hint={t('pawnColoursHint')} />
      </div>
    </Card>
  )
}
