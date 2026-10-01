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
                'relative flex flex-col items-center gap-1.5 rounded-3xl bg-card px-2 pt-4 pb-3 ring-1 transition active:scale-95 disabled:active:scale-100 dark:bg-slate',
                lead ? 'ring-2 ring-gold' : 'ring-edge dark:ring-white/8',
                !editable && 'opacity-60',
              )}
            >
              {lead && <Crown className="absolute top-2 right-3 size-5 text-gold" fill="currentColor" />}
              <Avatar name={seat.name} color={seat.color} size="lg" />
              <span className="w-full truncate text-center text-lg font-extrabold">{seat.name}</span>
              <span className="flex items-center gap-1 text-sm font-bold text-ink/60 dark:text-white/60">
                <Icon className={cx('size-4', losing ? 'text-danger' : 'text-gold')} />
                {losing ? tp('nLosses', row.total) : tp('nWins', row.total)}
              </span>
            </button>
          )
        })}
      </div>

      {played && (
        <ol className="mt-5 space-y-1.5 rounded-3xl bg-card p-4 ring-1 ring-edge dark:bg-slate dark:ring-white/8">
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
