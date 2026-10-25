import { Crown, Flame, Trophy } from 'lucide-react'
import { useI18n } from '../../../i18n'
import { buzz } from '../../../lib/haptics'
import type { Scorer } from '../../../lib/scorer'
import { standings } from '../../../lib/scoring'
import type { HotPotatoRound } from '../../../hooks/useHotPotatoRound'
import { Avatar, cx } from '../../ui'
import { PotatoTimer } from '../PotatoTimer'
import { seatColor } from '../../../lib/pawns'
import type { RoundTimer, Session } from '../../../types'
import { isHotPotato } from '../../../lib/games'

/** Who was tapped last round, for "Last burnt: …" (or "Lost/Won last round: …"). */
function lastTapped(session: Session): string | undefined {
  const last = session.rounds[session.rounds.length - 1]

  return last && session.seats.find((s) => last[s.id] === 1)?.name
}

/**
 * Hot Potato: the round timer on top, a tile per player below counting
 * losses (lowest wins) or wins. Tiles only take a tap once time has run out.
 */
export function TimedBoard({ session, scorer, timer, round }: { session: Session; scorer: Scorer; timer: RoundTimer; round: HotPotatoRound }) {
  const { t, tp } = useI18n()
  const table = standings(session)
  const byId = Object.fromEntries(table.map((r) => [r.seat.id, r]))
  const played = session.rounds.length > 0
  const { phase } = round
  const losing = session.rules.lowWins
  const potato = isHotPotato(session) && losing
  const Icon = losing ? Flame : Trophy

  const record = (p: string) => {
    buzz([10, 40, 20])
    scorer.apply([{ kind: 'round', p, index: session.rounds.length, v: 1 }])
    round.reset()
  }

  return (
    <>
      <PotatoTimer
        phase={phase}
        elapsedMs={round.elapsedMs}
        durationMs={round.durationMs}
        hidden={timer.hidden}
        maxMs={timer.max * 1000}
        lastTapped={lastTapped(session)}
        losing={losing}
        potato={potato}
        emoji={session.emoji}
      />

      <div className="flex items-center justify-between px-1 pt-3.5 pb-2 text-xs font-extrabold text-ink/50 uppercase dark:text-white/50">
        <span>{phase === 'boom' ? (potato ? t('tapWhoBurnt') : losing ? t('tapWhoLost') : t('tapWhoWon')) : losing ? t('losses') : t('wins')}</span>
        <span>{losing ? t('fewerIsBetter') : t('moreIsBetter')}</span>
      </div>

      <div
        className={cx(
          // header with subtitle (3.75rem) + timer card (19.25rem) + label (2.5rem) + bottom bar spacer (6rem) + page padding (1rem)
          'grid min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-32.5rem)] auto-rows-fr grid-cols-2 gap-2.5',
          phase === 'running' && 'opacity-55',
        )}
      >
        {session.seats.map((seat) => {
          const row = byId[seat.id]
          const lead = played && row.rank === 1 && session.seats.length > 1
          const boom = phase === 'boom'
          const background = boom
            ? `color-mix(in oklab, var(${losing ? '--color-danger' : '--color-gold'}) ${losing ? 12 : 24}%, var(--color-card))`
            : lead
              ? 'color-mix(in oklab, var(--color-gold) 30%, var(--color-card))'
              : `color-mix(in oklab, ${seatColor(seat)} 16%, var(--color-card))`

          return (
            <button
              key={seat.id}
              disabled={!boom || !scorer.canEdit(seat.id)}
              onClick={() => record(seat.id)}
              className={cx('surface flex min-h-0 flex-col rounded-3xl px-3 py-2.5 text-left', boom && 'press')}
              style={{ background }}
            >
              <span className="flex w-full items-center gap-1.5">
                <Avatar name={seat.name} color={seatColor(seat)} size="sm" />
                <span className="display min-w-0 flex-1 truncate text-lg font-extrabold">{seat.name}</span>
                {lead && !boom && <Crown className="size-5 shrink-0 rotate-12 text-gold drop-shadow-[1px_1px_0_var(--line)]" fill="currentColor" aria-label={t('leader')} />}
                {boom && <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[13px] font-black', losing ? 'bg-danger text-white' : 'bg-gold text-ink')}>+1</span>}
              </span>
              <span className="display flex flex-1 items-center justify-center py-1 text-7xl leading-[0.9] font-black tabular-nums">{row.total}</span>
              <span className="flex items-center justify-center gap-1 text-[13px] font-bold text-ink/60 dark:text-white/60">
                <Icon className={cx('size-4', losing ? 'text-danger' : 'text-gold')} />
                {losing ? tp('nLosses', row.total) : tp('nWins', row.total)}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
