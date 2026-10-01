import { useEffect, useState } from 'react'
import { ChevronDown, Crown, RotateCcw, Share2, Trash2, Undo2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { gapsToLeader, leaders, marginOfVictory, standings } from '../lib/scoring'
import { findGame, startSession } from '../lib/games'
import { getState, removeSession, updateSession, useStore } from '../lib/store'
import { navigate } from '../hooks/useRoute'
import { confirm, toast } from '../components/dialogs'
import { RoundsTable } from '../components/play/RoundsBoard'
import { SheetTable } from '../components/play/SheetBoard'
import { Avatar, BottomBar, Button, Card, Empty, Page, Section, cx } from '../components/ui'
import type { Session, Standing } from '../types'

const MEDAL = ['🥇', '🥈', '🥉']

/** First letter only — CSS `capitalize` would turn "1 października" into "1 Października". */
export const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1)

export function Podium({ table }: { table: Standing[] }) {
  const { num } = useI18n()
  // Classic podium order: 2nd, 1st, 3rd.
  const top = table.slice(0, 3)
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top
  const height = (rank: number) => (rank === 1 ? 'h-28' : rank === 2 ? 'h-20' : 'h-14')

  return (
    <div className="flex items-end justify-center gap-2 pt-4">
      {order.map((r) => (
        <div key={r.seat.id} className="flex w-28 animate-rise flex-col items-center">
          {r.rank === 1 && <Crown className="mb-1 size-9 -rotate-6 text-gold drop-shadow-[2px_2px_0_var(--line)]" fill="currentColor" />}
          <Avatar name={r.seat.name} color={r.seat.color} size={r.rank === 1 ? 'lg' : 'md'} />
          <span className="display mt-1 w-full truncate text-center font-extrabold">{r.seat.name}</span>
          <span className="display text-2xl font-black tabular-nums">{num(r.total)}</span>
          <div
            className={cx(
              'surface mt-1 flex w-full items-start justify-center !rounded-b-none !border-b-0 pt-2 text-3xl',
              height(r.rank),
              r.rank === 1 ? '!bg-gold' : r.rank === 2 ? '!bg-candy-b' : '!bg-candy-a',
            )}
          >
            {MEDAL[r.rank - 1]}
          </div>
        </div>
      ))}
    </div>
  )
}

function resultText(s: Session, i18n: ReturnType<typeof useI18n>) {
  const { t, text, date, num } = i18n
  const lines = [`${s.emoji} ${t('shareText', { game: text(s.rules.name), date: date(s.finishedAt ?? s.startedAt) })}`, '']

  for (const r of standings(s)) {
    lines.push(`${MEDAL[r.rank - 1] ?? `${r.rank}.`} ${r.seat.name} — ${num(r.total)}`)
  }

  return lines.join('\n')
}

export function Result({ id }: { id: string }) {
  const i18n = useI18n()
  const { t, tp, text, num, day, time, duration } = i18n
  const session = useStore((s) => s.sessions[id])
  const [notes, setNotes] = useState(session?.notes ?? '')

  // Save notes shortly after typing stops.
  useEffect(() => {
    if (!session || notes === (session.notes ?? '')) {
      return
    }

    const h = setTimeout(() => updateSession(id, (s) => ({ ...s, notes })), 600)

    return () => clearTimeout(h)
  }, [notes, id, session])

  if (!session || session.deleted) {
    return (
      <Page back="history">
        <Empty icon="🤷" title="404" />
      </Page>
    )
  }

  const table = standings(session)
  const tied = session.seats.length > 1 && !session.tieBreak && leaders(session).length > 1
  const tiedIds = new Set(
    table.filter((r) => r.total === table[0]?.total).map((r) => r.seat.id),
  )
  const winners = table.filter((r) => r.rank === 1)
  const gaps = gapsToLeader(table)
  const others = table.map((r, i) => ({ ...r, gap: gaps[i] })).filter((r) => r.rank !== 1)
  const margin = marginOfVictory(table)
  const mode = session.rules.mode
  const breakdown =
    mode === 'sheet'
      ? t('scoreSheetSummary', { n: session.rules.categories?.length ?? 0 })
      : (mode === 'rounds' || mode === 'winner') && session.rounds.length > 0
        ? tp('nRounds', session.rounds.length)
        : null

  const playAgain = () => {
    const game = findGame(session.gameId)
    const roster = getState().players
    const players = session.seats.map((s) => roster[s.id] ?? { ...s, updatedAt: 0 })
    const s = startSession(
      game ?? { id: session.gameId, emoji: session.emoji, updatedAt: 0, ...session.rules },
      players,
      { lowWins: session.rules.lowWins, target: session.rules.target },
    )

    navigate(`play/${s.id}`, { replace: true })
  }

  const share = async () => {
    const body = resultText(session, i18n)

    if (navigator.share) {
      try {
        await navigator.share({ text: body })

        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return
        }
      }
    }

    await navigator.clipboard?.writeText(body)
    toast(t('linkCopied'))
  }

  const del = async () => {
    if (!(await confirm(t('deleteGameConfirm'), { confirmLabel: t('delete'), danger: true }))) {
      return
    }

    removeSession(id)
    navigate('history', { replace: true })
  }

  const resume = () => {
    updateSession(id, (s) => ({ ...s, finishedAt: undefined, tieBreak: undefined }))
    navigate(`play/${id}`, { replace: true })
  }

  return (
    <Page
      back="history"
      title={
        <span className="flex items-center gap-2">
          <span>{session.emoji}</span>
          <span className="truncate">{text(session.rules.name)}</span>
        </span>
      }
    >
      <p className="px-1 text-sm font-semibold text-ink/55 dark:text-white/55">
        {capitalize(day(session.finishedAt ?? session.startedAt))} · {time(session.startedAt)}
        {session.finishedAt && ` · ${duration(session.finishedAt - session.startedAt)}`}
      </p>

      {session.seats.length > 1 ? (
        <div className="mt-3 surface flex flex-col items-center rounded-3xl !bg-[color-mix(in_oklab,var(--color-gold)_75%,var(--color-card))] px-[18px] pt-[18px] pb-4 text-ink">
          <span className="chip-on display -rotate-3 rounded-full px-3.5 py-1 text-[13px] font-extrabold tracking-[0.06em] uppercase">
            {winners.length > 1 ? t('shared') : t('winner')}
          </span>
          <span className="mt-3 flex -space-x-2">
            {winners.map((r) => (
              <Avatar key={r.seat.id} name={r.seat.name} color={r.seat.color} size="lg" />
            ))}
          </span>
          <span className="display mt-1.5 max-w-full truncate text-[30px] font-extrabold">{winners.map((r) => r.seat.name).join(', ')}</span>
          <span className="display text-[112px] leading-[0.9] font-black tabular-nums">{num(winners[0].total)}</span>
          {margin > 0 && <span className="mt-2 text-[15px] font-bold">{tp('nPointsAhead', margin)}</span>}
        </div>
      ) : (
        <div className="py-6 text-center">
          <Avatar name={table[0].seat.name} color={table[0].seat.color} size="lg" />
          <p className="mt-2 display text-5xl font-black tabular-nums">{num(table[0].total)}</p>
        </div>
      )}

      {tied && (
        <Card className="mt-4 !bg-gold/20">
          <p className="font-extrabold">{t('tieBreakTitle')}</p>
          <p className="text-sm text-ink/65 dark:text-white/65">{t('tieBreakBody')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {table
              .filter((r) => tiedIds.has(r.seat.id))
              .map((r) => (
                <button
                  key={r.seat.id}
                  onClick={() => updateSession(id, (s) => ({ ...s, tieBreak: r.seat.id }))}
                  className="surface press flex items-center gap-2 rounded-full py-1 pr-3.5 pl-1 font-bold"
                >
                  <Avatar name={r.seat.name} color={r.seat.color} size="sm" /> {r.seat.name}
                </button>
              ))}
          </div>
        </Card>
      )}
      {session.tieBreak && (
        <button
          onClick={() => updateSession(id, (s) => ({ ...s, tieBreak: undefined }))}
          className="mx-auto mt-2 flex items-center gap-1 text-sm font-bold text-ink/50 dark:text-white/50"
        >
          <Undo2 className="size-4" /> {t('tieBreakTitle')} — {t('shared')}
        </button>
      )}

      {(others.length > 0 || breakdown) && (
        <div className="mt-3 surface overflow-hidden rounded-3xl">
          {others.map((r) => (
            <div key={r.seat.id} className="flex items-center gap-3 border-b border-edge px-3.5 py-2.5 last:border-0 dark:border-white/8">
              <span className="display w-5 text-xl font-black text-ink/40 dark:text-white/40">{r.rank}</span>
              <Avatar name={r.seat.name} color={r.seat.color} size="sm" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[17px] font-extrabold">{r.seat.name}</span>
                <span className="block text-[13px] font-semibold text-ink/55 dark:text-white/55">{t('behindWinner', { n: num(r.gap) })}</span>
              </span>
              <span className="display text-[40px] leading-none font-black tabular-nums">{num(r.total)}</span>
            </div>
          ))}
          {breakdown && (
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 text-[15px] font-extrabold [&::-webkit-details-marker]:hidden">
                {breakdown}
                <ChevronDown className="size-5 transition group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-3">{mode === 'sheet' ? <SheetTable session={session} /> : <RoundsTable session={session} />}</div>
            </details>
          )}
        </div>
      )}

      <Section title={t('notes')}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('notesPlaceholder')}
          rows={3}
          maxLength={2000}
          className="surface-flat w-full rounded-2xl p-4 text-base outline-none placeholder:text-ink/35 focus:!border-accent focus:ring-2 focus:ring-accent/30 dark:placeholder:text-white/35"
        />
      </Section>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button onClick={resume}>
          <Undo2 className="size-5" /> {t('resume')}
        </Button>
        <Button variant="danger" onClick={del}>
          <Trash2 className="size-5" /> {t('delete')}
        </Button>
      </div>

      <BottomBar>
        <Button size="lg" onClick={share} aria-label={t('shareResults')} className="shrink-0 !px-4">
          <Share2 className="size-5" />
        </Button>
        <Button variant="primary" size="lg" className="flex-1" onClick={playAgain}>
          <RotateCcw className="size-5" strokeWidth={2.5} /> {t('playAgain')}
        </Button>
      </BottomBar>
    </Page>
  )
}
