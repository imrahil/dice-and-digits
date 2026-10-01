import { Crown, Flame, Trophy } from 'lucide-react'
import { useI18n } from '../../i18n'
import { buzz } from '../../lib/haptics'
import type { Scorer } from '../../lib/scorer'
import { standings } from '../../lib/scoring'
import type { Session } from '../../types'
import { Avatar, cx } from '../ui'

/**
 * For games with no points (Exploding Kittens, Hot Potato): one tap records
 * who won the round, or who lost it when the game is set to lowest-wins.
 * Stored as an ordinary round with 1 for that player.
 */
export function WinnerBoard({ session, scorer }: { session: Session; scorer: Scorer }) {
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
              <Avatar name={seat.name} color={seat.color} size="lg" />
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
