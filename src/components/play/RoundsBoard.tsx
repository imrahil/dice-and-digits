import { useState } from 'react'
import { ArrowRight, Check, Crown, Trash2, Trophy } from 'lucide-react'
import { useI18n } from '../../i18n'
import { buzz } from '../../lib/haptics'
import { gapsToLeader, marginOfVictory, standings, targetProgress, toTarget } from '../../lib/scoring'
import { updateSession } from '../../lib/store'
import { zeroSumWinner } from '../../lib/ops'
import type { Scorer } from '../../lib/scorer'
import type { Session } from '../../types'
import { Keypad, parseKeypad } from '../Keypad'
import { Avatar, Button, IconButton, Sheet, cx } from '../ui'

/**
 * Score grid shared by the rounds board and the result screen. `compact`
 * (the board) drops avatars and totals from the header, since the standing
 * cards above it already show them.
 */
export function RoundsTable({
  session,
  onRow,
  compact,
  highlightLast,
}: {
  session: Session
  onRow?: (i: number) => void
  compact?: boolean
  /** Tint the latest round so the table shows where the game is. */
  highlightLast?: boolean
}) {
  const { t, num } = useI18n()
  const table = standings(session)
  const byId = Object.fromEntries(table.map((r) => [r.seat.id, r]))
  const n = session.seats.length
  const fit = compact && n < 5
  const cols = `2.75rem repeat(${n}, ${fit ? 'minmax(0, 1fr)' : 'minmax(4.25rem, 1fr)'})`
  const scored = session.rounds.length > 0 && n > 1
  const winner = session.rules.mode === 'winner'
  const lastIndex = session.rounds.length - 1

  return (
    <div className={cx(!fit && '-mx-4 overflow-x-auto px-4 pb-2')}>
      <div className="surface min-w-fit overflow-hidden rounded-3xl">
        {compact ? (
          <div className="grid border-b border-edge py-2 dark:border-white/8" style={{ gridTemplateColumns: cols }}>
            <span />
            {session.seats.map((s) => (
              <span key={s.id} className="truncate px-1 text-center text-[13px] font-extrabold text-ink/60 dark:text-white/60">
                {s.name}
              </span>
            ))}
          </div>
        ) : (
          <div className="grid border-b border-edge dark:border-white/8" style={{ gridTemplateColumns: cols }}>
            <span />
            {session.seats.map((s) => {
              const lead = scored && byId[s.id].rank === 1

              return (
                <div key={s.id} className={cx('flex flex-col items-center gap-1 px-1 pt-3 pb-2', lead && 'bg-gold/12')}>
                  <span className="relative">
                    <Avatar name={s.name} color={s.color} size="sm" />
                    {lead && <Crown className="absolute -top-2.5 -right-2 size-4 rotate-12 text-gold" fill="currentColor" />}
                  </span>
                  <span className="w-full truncate text-center text-xs font-bold">{s.name}</span>
                  <span className="display text-2xl font-black tabular-nums">{num(byId[s.id].total)}</span>
                </div>
              )
            })}
          </div>
        )}
        {session.rounds.map((r, i) => {
          const latest = highlightLast && i === lastIndex

          return (
            <button
              key={i}
              disabled={!onRow}
              onClick={() => onRow?.(i)}
              className={cx(
                'grid w-full items-center border-b border-edge/70 last:border-0 active:bg-ink/5 dark:border-white/5 dark:active:bg-white/5',
                compact ? 'py-[3px]' : 'py-2',
                latest && 'bg-accent/15',
              )}
              style={{ gridTemplateColumns: cols }}
              aria-label={onRow ? t('editRound', { n: i + 1 }) : undefined}
              aria-current={latest ? 'true' : undefined}
            >
              <span className="text-center text-xs font-black text-ink/40 tabular-nums dark:text-white/40">{i + 1}</span>
              {session.seats.map((s) => {
                const v = r[s.id]

                return (
                  <span
                    key={s.id}
                    className={cx('text-center font-bold tabular-nums', compact ? 'text-[19px]' : 'text-lg', v != null && v < 0 && 'text-danger')}
                  >
                    {v == null ? '·' : winner ? (v ? (session.rules.lowWins ? '🔥' : '🏆') : '·') : num(v)}
                  </span>
                )
              })}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** One card per player, best first: gap to the leader and progress to the target. */
function StandingCards({ session }: { session: Session }) {
  const { t, num } = useI18n()
  const table = standings(session)
  const gaps = gapsToLeader(table)
  const margin = marginOfVictory(table)
  const target = session.rules.target
  const scored = session.rounds.length > 0

  return (
    <div className="flex flex-col gap-2.5">
      {table.map((r, i) => {
        const lead = scored && r.rank === 1 && table.length > 1
        const left = toTarget(r.total, target)
        const progress = targetProgress(r.total, target)

        return (
          <div
            key={r.seat.id}
            className={cx(
              'surface flex flex-col gap-1.5 rounded-3xl px-3.5 pt-2 pb-2.5',
              lead && '!bg-[color-mix(in_oklab,var(--color-gold)_30%,var(--color-card))]',
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="display w-5 text-xl font-black text-ink/40 dark:text-white/40">{r.rank}</span>
              <Avatar name={r.seat.name} color={r.seat.color} size="sm" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="display block truncate text-[19px] font-extrabold">{r.seat.name}</span>
                {scored && r.rank === 1 && (margin > 0 || left !== null) && (
                  <span className="block text-[13px] font-bold text-mint">
                    {[margin > 0 && t('leadsBy', { n: num(margin) }), left !== null && t('toTarget', { n: num(left) })].filter(Boolean).join(' · ')}
                  </span>
                )}
                {scored && r.rank !== 1 && (
                  <span className="block truncate text-[13px] font-bold text-ink/60 dark:text-white/60">{t('behindLeader', { n: num(gaps[i]) })}</span>
                )}
              </span>
              <span className="display text-5xl leading-[0.9] font-black tabular-nums">{num(r.total)}</span>
            </div>
            {progress !== null && (
              <div className="h-2 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10" aria-hidden>
                <div
                  className={cx('h-full rounded-full', session.rules.lowWins && 'opacity-60')}
                  style={{ width: `${progress * 100}%`, background: r.seat.color }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function RoundsBoard({
  session,
  scorer,
  entry,
  setEntry,
}: {
  session: Session
  scorer: Scorer
  entry: number | null
  setEntry: (i: number | null) => void
}) {
  const { t } = useI18n()

  return (
    <>
      <StandingCards session={session} />
      {session.rounds.length > 0 ? (
        <div className="mt-4">
          <RoundsTable session={session} onRow={setEntry} compact highlightLast />
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-ink/55 dark:text-white/55">{t('noRoundsYet')}</p>
      )}
      {entry !== null && <RoundEntry key={entry} session={session} scorer={scorer} index={entry} onClose={() => setEntry(null)} />}
    </>
  )
}

/**
 * Bottom sheet: one keypad, one row per player the scorer may edit, "Next"
 * walks the rows. Rows nobody has touched show the live value, so a score a
 * player sends from their own phone while this is open is neither hidden nor
 * overwritten.
 */
function RoundEntry({ session, scorer, index, onClose }: { session: Session; scorer: Scorer; index: number; onClose: () => void }) {
  const { t } = useI18n()
  const seats = session.seats.filter((s) => scorer.canEdit(s.id))
  const everyone = seats.length === session.seats.length
  const editing = index < session.rounds.length
  const current = session.rounds[index] ?? {}
  const [typed, setTyped] = useState<Record<string, string>>({})
  const shown = (id: string) => typed[id] ?? (current[id] != null ? String(current[id]) : '')
  const [focus, setFocus] = useState(0)
  const seat = seats[focus]
  const last = focus === seats.length - 1

  const save = () => {
    // Send what was typed, and fill still-empty rows with 0 so the round is complete.
    const ops = seats
      .filter((s) => s.id in typed || current[s.id] == null)
      .map((s) => ({ kind: 'round' as const, p: s.id, index, v: parseKeypad(typed[s.id] ?? '') ?? 0 }))

    buzz([8, 40, 8])
    scorer.apply(ops)
    onClose()
  }

  const remove = () => {
    updateSession(session.id, (s) => ({ ...s, rounds: s.rounds.filter((_, i) => i !== index) }))
    onClose()
  }

  if (!seat) {
    return null
  }

  const twoCol = seats.length > 4

  return (
    <Sheet
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {editing ? t('editRound', { n: index + 1 }) : t('roundN', { n: index + 1 })}
          {editing && everyone && (
            <IconButton label={t('deleteRound')} onClick={remove} className="ml-auto !text-danger dark:!text-[#ff8a93]">
              <Trash2 className="size-5" />
            </IconButton>
          )}
        </span>
      }
    >
      <div className={cx('mb-3 grid gap-1.5', twoCol && 'grid-cols-2')}>
        {seats.map((s, i) => {
          const v = shown(s.id)

          return (
            <button
              key={s.id}
              onClick={() => setFocus(i)}
              className={cx(
                'flex h-12 items-center gap-2 rounded-2xl px-2 text-left transition',
                i === focus ? 'bg-card ring-2 ring-accent dark:bg-night' : 'bg-ink/4 dark:bg-white/5',
              )}
            >
              <Avatar name={s.name} color={s.color} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{s.name}</span>
              <span className={cx('display text-xl font-black tabular-nums', v === '' && 'text-ink/25 dark:text-white/25', v.startsWith('-') && 'text-danger')}>
                {v || '0'}
              </span>
            </button>
          )
        })}
      </div>
      {session.rules.zeroSum && everyone && (
        <button
          className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-gold/12 px-3 py-2 text-left transition active:scale-[0.98]"
          onClick={() => {
            const others = seats.filter((s) => s.id !== seat.id).map((s) => parseKeypad(shown(s.id)) ?? 0)

            setTyped((x) => ({ ...x, [seat.id]: String(zeroSumWinner(others)) }))
          }}
        >
          <Trophy className="size-5 shrink-0 text-gold" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold">
              {t('roundWinner')}: {seat.name}
            </span>
            <span className="block text-xs text-ink/55 dark:text-white/55">{t('roundWinnerHint')}</span>
          </span>
        </button>
      )}
      <Keypad value={shown(seat.id)} onChange={(v) => setTyped((x) => ({ ...x, [seat.id]: v }))} />
      <div className="mt-3 flex gap-3">
        {!last && (
          <Button size="lg" className="flex-1" onClick={save}>
            <Check className="size-5" /> {t('save')}
          </Button>
        )}
        <Button variant="primary" size="lg" className="flex-1" onClick={() => (last ? save() : setFocus(focus + 1))}>
          {last ? (
            <>
              <Check className="size-5" strokeWidth={3} /> {t('save')}
            </>
          ) : (
            <>
              <span className="truncate">{seats[focus + 1].name}</span> <ArrowRight className="size-5 shrink-0" strokeWidth={3} />
            </>
          )}
        </Button>
      </div>
    </Sheet>
  )
}
