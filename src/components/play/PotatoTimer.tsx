import { useI18n } from '../../i18n'
import { mmss } from '../../lib/sound'
import { cx } from '../ui'

export type PotatoTimerProps = {
  phase: 'idle' | 'running' | 'boom'
  elapsedMs: number
  durationMs: number
  /** Hidden: counts up against `maxMs`; visible: counts down this round's length. */
  hidden: boolean
  maxMs: number
  /** Who got burnt last round, for the idle hint. */
  lastBurnt?: string
}

const SIZE = 196
const TRACK = 14
const R = (SIZE - TRACK) / 2
const C = 2 * Math.PI * R

/** Hot Potato round timer. Hidden mode counts up so nobody can tell when it goes off. */
export function PotatoTimer({ phase, elapsedMs, durationMs, hidden, maxMs, lastBurnt }: PotatoTimerProps) {
  const { t } = useI18n()
  const running = phase === 'running'
  const remainingMs = Math.max(0, durationMs - elapsedMs)
  const fill = !running ? 0 : hidden ? elapsedMs / (maxMs || 1) : remainingMs / (durationMs || 1)
  const time = !running ? '?' : hidden ? mmss(Math.floor(elapsedMs / 1000)) : mmss(Math.ceil(remainingMs / 1000))
  const label = running ? (hidden ? t('potatoElapsed') : t('potatoLeft')) : hidden ? t('potatoHiddenTime') : t('potatoRandomTime')
  const hint = running
    ? hidden
      ? `${t('potatoPass')} ${t('potatoAnySecond')}`
      : t('potatoPass')
    : lastBurnt
      ? t('potatoLast', { name: lastBurnt })
      : t('potatoIdle')

  return (
    <div
      className={cx(
        'surface mt-1 flex h-[300px] flex-col items-center justify-center gap-3.5 rounded-3xl px-4 text-center',
        running && '!bg-[color-mix(in_oklab,var(--color-danger)_14%,var(--color-card))]',
        phase === 'boom' && '!bg-danger text-white',
      )}
      role="timer"
      aria-live="polite"
    >
      {phase === 'boom' ? (
        <>
          <span className="text-[88px] leading-none" aria-hidden>
            💥
          </span>
          <span className="display text-[64px] leading-[0.9] font-black">{t('potatoBoom')}</span>
          <span className="flex flex-col gap-1">
            <span className="text-lg font-extrabold">{t('potatoWho')}</span>
            <span className="text-sm font-bold opacity-85">{t('potatoAfter', { time: mmss(Math.round(durationMs / 1000)) })}</span>
          </span>
        </>
      ) : (
        <>
          <span className="relative flex size-[196px] items-center justify-center">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 size-full -rotate-90" aria-hidden>
              <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={TRACK} className="stroke-ink/10 dark:stroke-white/10" />
              {fill > 0 && (
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  strokeWidth={TRACK}
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - Math.min(1, fill))}
                  className="stroke-danger transition-[stroke-dashoffset] duration-200"
                />
              )}
            </svg>
            <span className="surface-flat relative flex size-[168px] flex-col items-center justify-center rounded-full">
              <span className="text-[44px] leading-none" aria-hidden>
                🥔
              </span>
              <span className="display text-[56px] leading-none font-black tabular-nums">{time}</span>
              <span className="mt-0.5 text-xs font-extrabold tracking-[0.04em] text-ink/55 uppercase dark:text-white/55">{label}</span>
            </span>
          </span>
          <span className="text-base font-extrabold">{hint}</span>
        </>
      )}
    </div>
  )
}
