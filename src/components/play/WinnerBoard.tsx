import { Crown, Flame, Trophy } from 'lucide-react'
import { useI18n } from '../../i18n'
import { buzz } from '../../lib/haptics'
import type { Scorer } from '../../lib/scorer'
import { standings } from '../../lib/scoring'
import { useHotPotatoRound, type HotPotatoRound, type PotatoPhase } from '../../hooks/useHotPotatoRound'
import type { RoundTimer, Session } from '../../types'
import { Avatar, cx } from '../ui'
import { PotatoTimer } from './PotatoTimer'
import { seatColor } from '../../lib/pawns'

/**
 * For games with no points (Exploding Kittens, Hot Potato): one tap records
 * who won the round, or who lost it when the game is set to lowest-wins.
 * Stored as an ordinary round with 1 for that player.
 */
export function WinnerBoard({
  session,
  scorer,
  round,
  phase,
  untimed,
}: {
  session: Session
  scorer: Scorer
  /** The round timer, when the screen around it drives it (Play's bottom bar). */
  round?: HotPotatoRound
  /** Show a fixed timer phase (previews and designs, no clock). */
  phase?: PotatoPhase
  /** Ignore `rules.timer`: a joined phone just records, the host runs the clock. */
  untimed?: boolean
}) {
  const own = useHotPotatoRound(session.rules.timer)
  const timer = untimed ? undefined : session.rules.timer

  if (timer) {
    const r = round ?? own

    return <TimedBoard session={session} scorer={scorer} timer={timer} round={phase ? { ...r, phase } : r} />
  }

  return <TapBoard session={session} scorer={scorer} />
}

/** One tap per round on whoever won (or lost) it. */
function TapBoard({ session, scorer }: { session: Session; scorer: Scorer }) {
  const { t, tp } = useI18n()
  const losing = session.rules.lowWins
  const table = standings(session)
  const byId = Object.fromEntries(table.map((r) => [r.seat.id, r]))
  const played = session.rounds.length > 0
  const Icon = losing ? Flame : Trophy

  const record = (p: string) => {
    buzz([10, 40, 20])
    scorer.apply([{ kind: 'round', p, index: session.rounds.length, v: 1 }])
  }

  return (
    <>
      <p className="mb-3 px-1 text-lg font-extrabold">{losing ? t('whoLost') : t('whoWon')}</p>
      <div className="grid grid-cols-2 gap-3">
        {session.seats.map((seat) => {
          const row = byId[seat.id]
          const lead = played && row.rank === 1 && session.seats.length > 1
          const editable = scorer.canEdit(seat.id)

          return (
            <button
              key={seat.id}
              disabled={!editable}
              onClick={() => record(seat.id)}
              className={cx(
                'surface press relative flex flex-col items-center gap-1.5 rounded-3xl px-2 pt-4 pb-3',
                lead && '!bg-gold/25 dark:!bg-gold/15',
                !editable && 'opacity-60',
              )}
            >
              {lead && <Crown className="absolute -top-3 right-2 size-7 rotate-12 text-gold drop-shadow-[1px_1px_0_var(--line)]" fill="currentColor" />}
              <Avatar name={seat.name} color={seatColor(seat)} size="lg" />
              <span className="display w-full truncate text-center text-lg font-extrabold">{seat.name}</span>
              <span className="flex items-center gap-1 text-sm font-bold text-ink/60 dark:text-white/60">
                <Icon className={cx('size-4', losing ? 'text-danger' : 'text-gold')} />
                {losing ? tp('nLosses', row.total) : tp('nWins', row.total)}
              </span>
            </button>
          )
        })}
      </div>

      {played && (
        <ol className="surface mt-5 space-y-1.5 rounded-3xl p-4">
          {session.rounds
            .map((r, i) => ({ i, who: session.seats.filter((s) => r[s.id] === 1) }))
            .reverse()
            .slice(0, 8)
            .map(({ i, who }) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 font-bold text-ink/50 dark:text-white/50">{t('roundN', { n: i + 1 })}</span>
                <Icon className={cx('size-4 shrink-0', losing ? 'text-danger' : 'text-gold')} />
                <span className="truncate font-extrabold">{who.map((s) => s.name).join(', ')}</span>
              </li>
            ))}
          {session.rounds.length > 8 && <li className="text-center text-xs text-ink/45 dark:text-white/45">…</li>}
        </ol>
      )}
    </>
  )
}

/** The last round's loser, for "Last burnt: …". */
function lastBurnt(session: Session): string | undefined {
  const last = session.rounds[session.rounds.length - 1]

  return last && session.seats.find((s) => last[s.id] === 1)?.name
}

/**
 * Hot Potato: the round timer on top, a loss tile per player below. Tiles
 * only take a tap once the potato has gone off.
 */
function TimedBoard({ session, scorer, timer, round }: { session: Session; scorer: Scorer; timer: RoundTimer; round: HotPotatoRound }) {
  const { t, tp } = useI18n()
  const table = standings(session)
  const byId = Object.fromEntries(table.map((r) => [r.seat.id, r]))
  const played = session.rounds.length > 0
  const { phase } = round

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
        lastBurnt={lastBurnt(session)}
      />

      <div className="flex items-center justify-between px-1 pt-3.5 pb-2 text-xs font-extrabold text-ink/50 uppercase dark:text-white/50">
        <span>{phase === 'boom' ? t('tapWhoBurnt') : t('losses')}</span>
        <span>{t('fewerIsBetter')}</span>
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
            ? 'color-mix(in oklab, var(--color-danger) 12%, var(--color-card))'
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
                {boom && <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 text-[13px] font-black text-white">+1</span>}
              </span>
              <span className="display flex flex-1 items-center justify-center py-1 text-7xl leading-[0.9] font-black tabular-nums">{row.total}</span>
              <span className="flex items-center justify-center gap-1 text-[13px] font-bold text-ink/60 dark:text-white/60">
                <Flame className="size-4 text-danger" />
                {tp('nLosses', row.total)}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
