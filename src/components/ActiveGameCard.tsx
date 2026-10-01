import { ArrowRight } from 'lucide-react'
import { useI18n } from '../i18n'
import { liveHandle } from '../lib/cloud'
import { isEmpty, standings } from '../lib/scoring'
import { navigate } from '../hooks/useRoute'
import { useNow } from '../hooks/useNow'
import type { Seat, Session } from '../types'
import { Button, cx } from './ui'

/** At most this many score cells; a bigger table shows the top three and "+n". */
const MAX_CELLS = 4

/** Has this player got anything on the score sheet yet? */
const onSheet = (s: Session, seat: Seat) => Object.values(s.sheet).some((row) => row[seat.id] != null)

/** The game in progress on the home screen: who's winning, and a way back in. */
export function ActiveGameCard({
  session,
  live = Boolean(liveHandle(session.id)),
}: {
  session: Session
  /** Shared live right now (defaults to this phone's live handle for the game). */
  live?: boolean
}) {
  const { t, text, num, duration } = useI18n()
  const now = useNow(15000)
  const table = standings(session)
  const byId = Object.fromEntries(table.map((r) => [r.seat.id, r]))
  const scored = !isEmpty(session) && session.seats.length > 1
  const crowded = session.seats.length > MAX_CELLS
  const shown = crowded ? table.slice(0, MAX_CELLS - 1).map((r) => r.seat) : session.seats
  const target = session.rules.target
  const meta = [t('inProgress'), duration(now - session.startedAt), target != null && t('toTargetValue', { n: num(target) })]

  return (
    <div className="surface overflow-hidden rounded-3xl" data-testid="active-game">
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2.5">
        <span className="emoji-tile flex size-11 shrink-0 items-center justify-center rounded-2xl text-2xl">{session.emoji}</span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="display block truncate text-xl font-extrabold">{text(session.rules.name)}</span>
          <span className="block truncate text-[13px] font-semibold text-ink/60 dark:text-white/60">{meta.filter(Boolean).join(' · ')}</span>
        </span>
        {live && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-danger px-2.5 py-1 text-xs font-black text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" /> LIVE
          </span>
        )}
      </div>

      <div
        className="grid border-t-[length:var(--bw)] border-(--line)"
        style={{ gridTemplateColumns: `repeat(${Math.min(session.seats.length, MAX_CELLS)}, minmax(0, 1fr))` }}
      >
        {shown.map((seat) => {
          const row = byId[seat.id]
          const blank = session.rules.mode === 'sheet' && !onSheet(session, seat)

          return (
            <div
              key={seat.id}
              className={cx(
                'flex min-w-0 flex-col items-center gap-0.5 border-r border-edge px-1 py-2.5 last:border-0 dark:border-white/8',
                scored && row.rank === 1 && 'bg-gold/20',
              )}
            >
              <span className="flex max-w-full items-center gap-1 text-[13px] font-bold">
                <span className="size-2 shrink-0 rounded-full" style={{ background: seat.color }} />
                <span className="truncate">{seat.name}</span>
              </span>
              <span className="display text-[40px] leading-none font-black tabular-nums">{blank ? '—' : num(row.total)}</span>
            </div>
          )
        })}
        {crowded && (
          <div className="flex flex-col items-center justify-center px-1 py-2.5 text-ink/50 dark:text-white/50">
            <span className="display text-[28px] leading-none font-black">+{session.seats.length - (MAX_CELLS - 1)}</span>
          </div>
        )}
      </div>

      <div className="border-t-[length:var(--bw)] border-(--line) p-2.5">
        <Button variant="primary" size="lg" className="w-full" onClick={() => navigate(`play/${session.id}`)}>
          {t('resumeGame')} <ArrowRight className="size-5" strokeWidth={3} />
        </Button>
      </div>
    </div>
  )
}
