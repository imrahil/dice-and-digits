import { useEffect, useState } from 'react'
import { CloudOff, Crown, Hand, Loader2, Plus, Radio } from 'lucide-react'
import { useI18n } from '../i18n'
import { cloudEnabled } from '../lib/cloud'
import { nextRoundFor } from '../lib/ops'
import { standings } from '../lib/scoring'
import { useNow } from '../hooks/useNow'
import { useRoom, type RoomView } from '../hooks/useRoom'
import { toast } from '../components/dialogs'
import { CounterBoard } from '../components/play/CounterBoard'
import { RoundsBoard, RoundsTable } from '../components/play/RoundsBoard'
import { SheetBoard, SheetTable } from '../components/play/SheetBoard'
import { WinnerBoard } from '../components/play/WinnerBoard'
import { Avatar, BottomBar, Button, Card, Empty, Page, Section, cx } from '../components/ui'
import type { Session } from '../types'
import { Podium } from './Result'

const NOTICE = {
  taken: 'noticeTaken',
  rejected: 'noticeRejected',
  finished: 'noticeFinished',
  full: 'noticeFull',
} as const

/**
 * A friend's phone following a live game (opened from the QR code). Watching
 * by default; after picking a seat it becomes a scorer for that one player.
 */
export function Live({ code }: { code: string }) {
  const { t } = useI18n()

  if (!cloudEnabled) {
    return (
      <Page title={t('liveTitle')} back="">
        <Empty icon="📡">{t('cloudUnavailable')}</Empty>
      </Page>
    )
  }

  return <LiveRoom key={code} code={code.toUpperCase()} />
}

function LiveRoom({ code }: { code: string }) {
  const { t, text } = useI18n()
  const room = useRoom(code)
  const [entry, setEntry] = useState<number | null>(null)

  useNow(10000)

  useEffect(() => {
    if (room.notice) {
      toast(t(NOTICE[room.notice.code as keyof typeof NOTICE] ?? 'noticeRejected'))
    }
  }, [room.notice, t])

  if (room.status === 'notfound' || (room.status === 'ended' && !room.session)) {
    return (
      <Page title={t('liveTitle')} back="">
        <Empty icon="📡">{t('liveNotFound')}</Empty>
      </Page>
    )
  }

  const s = room.session

  if (!s) {
    return (
      <Page title={t('liveTitle')} back="">
        <div className="flex justify-center py-20">
          <Radio className="size-10 animate-pulse text-accent" />
        </div>
      </Page>
    )
  }

  const finished = Boolean(s.finishedAt)
  const stopped = !finished && room.status === 'ended'
  const me = room.mySeat && !finished && !stopped ? s.seats.find((x) => x.id === room.mySeat) : undefined

  return (
    <Page
      back=""
      bare
      title={
        <span className="flex items-center gap-2">
          {s.emoji} <span className="truncate">{text(s.rules.name)}</span>
        </span>
      }
      actions={!finished && !stopped && <StatusPill room={room} />}
    >
      {finished ? (
        <Final session={s} />
      ) : stopped ? (
        <>
          <p className="flex items-start gap-2 rounded-2xl bg-ink/6 px-4 py-3 text-sm font-semibold dark:bg-white/8">
            <Radio className="mt-0.5 size-4 shrink-0" /> {t('liveStopped')}
          </p>
          <Watch session={s} />
        </>
      ) : me ? (
        <>
          <Card className="mb-3 flex items-center gap-3 !p-3">
            <Avatar name={me.name} color={me.color} />
            <span className="min-w-0 flex-1 truncate font-extrabold">{t('youScoreAs', { name: me.name })}</span>
            <Button size="sm" variant="ghost" onClick={room.leave}>
              {t('changeSeat')}
            </Button>
          </Card>
          {room.status === 'open' && !room.hostOnline && (
            <p className="mb-3 flex items-start gap-2 rounded-2xl bg-gold/15 px-4 py-3 text-sm font-semibold">
              <CloudOff className="mt-0.5 size-4 shrink-0" /> {t('hostOffline')}
            </p>
          )}
          <GuestBoard session={s} room={room} entry={entry} setEntry={setEntry} />
          {room.pending > 0 && (
            <p className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-ink/55 dark:text-white/55">
              <Loader2 className="size-4 animate-spin" /> {t('sendingPoints')}
            </p>
          )}
          {s.rules.mode === 'rounds' && (
            <BottomBar>
              <Button variant="primary" size="lg" className="flex-1" onClick={() => setEntry(nextRoundFor(s, me.id))}>
                <Plus className="size-6" strokeWidth={3} /> {t('addMyScore')}
              </Button>
            </BottomBar>
          )}
        </>
      ) : (
        <>
          <SeatPicker session={s} room={room} />
          <Watch session={s} />
        </>
      )}
    </Page>
  )
}

function StatusPill({ room }: { room: RoomView }) {
  const { t } = useI18n()

  if (room.status === 'open') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-danger px-2.5 py-1 text-xs font-black text-white">
        <span className="size-1.5 animate-pulse rounded-full bg-white" /> LIVE
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-ink/10 px-2.5 py-1 text-xs font-bold dark:bg-white/10">
      <Loader2 className="size-3 animate-spin" />
      {room.status === 'loading' || room.status === 'connecting' ? t('connecting') : t('reconnecting')}
    </span>
  )
}

function SeatPicker({ session, room }: { session: Session; room: RoomView }) {
  const { t } = useI18n()
  const ready = room.status === 'open'

  return (
    <Card className="mb-2">
      <p className="flex items-center gap-2 text-lg font-extrabold">
        <Hand className="size-5 text-accent" /> {t('joinAsPlayer')}
      </p>
      <p className="mt-0.5 text-sm text-ink/60 dark:text-white/60">{t('joinAsPlayerHint')}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {session.seats.map((seat) => {
          const taken = room.seats[seat.id]

          return (
            <button
              key={seat.id}
              disabled={taken || !ready}
              onClick={() => room.claim(seat.id)}
              className={cx(
                'flex h-14 items-center gap-2 rounded-2xl px-2 text-left ring-1 transition active:scale-95 disabled:active:scale-100',
                taken ? 'opacity-45 ring-edge dark:ring-white/8' : 'bg-paper ring-edge dark:bg-night dark:ring-white/10',
              )}
            >
              <Avatar name={seat.name} color={seat.color} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{seat.name}</span>
                {taken && <span className="block text-xs font-semibold">{t('seatTaken')}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

/** Same boards as the host, limited by the room's scorer to this phone's seat. */
function GuestBoard({
  session,
  room,
  entry,
  setEntry,
}: {
  session: Session
  room: RoomView
  entry: number | null
  setEntry: (i: number | null) => void
}) {
  switch (session.rules.mode) {
    case 'counter': {
      // Own card first: it's the only one with buttons.
      const seats = [...session.seats].sort((a, b) => Number(b.id === room.mySeat) - Number(a.id === room.mySeat))

      return <CounterBoard session={{ ...session, seats }} scorer={room.scorer} />
    }

    case 'rounds':
      return <RoundsBoard session={session} scorer={room.scorer} entry={entry} setEntry={setEntry} />
    case 'sheet':
      return <SheetBoard session={session} scorer={room.scorer} />
    case 'winner':
      return <WinnerBoard session={session} scorer={room.scorer} />
  }
}

function Leaderboard({ session }: { session: Session }) {
  const { t, num } = useI18n()
  const table = standings(session)
  const anyScore = table.some((r) => r.total !== 0)

  return (
    <Section title={t('leaderboard')}>
      <Card className="!p-2">
        {table.map((r) => (
          <div key={r.seat.id} className={cx('flex items-center gap-3 rounded-2xl px-2 py-2.5', r.rank === 1 && anyScore && 'bg-gold/12')}>
            <span className="w-6 text-center font-black text-ink/50 tabular-nums dark:text-white/50">{r.rank}</span>
            <Avatar name={r.seat.name} color={r.seat.color} />
            <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-lg font-extrabold">
              {r.seat.name}
              {r.rank === 1 && anyScore && <Crown className="size-4 shrink-0 text-gold" fill="currentColor" />}
            </span>
            <span className="text-3xl font-black tabular-nums">{num(r.total)}</span>
          </div>
        ))}
      </Card>
    </Section>
  )
}

function Tables({ session }: { session: Session }) {
  const { t } = useI18n()

  if ((session.rules.mode === 'rounds' || session.rules.mode === 'winner') && session.rounds.length > 0) {
    return (
      <Section title={t('modeRounds')}>
        <RoundsTable session={session} />
      </Section>
    )
  }

  if (session.rules.mode === 'sheet') {
    return (
      <Section title={t('modeSheet')}>
        <SheetTable session={session} />
      </Section>
    )
  }

  return null
}

function Watch({ session }: { session: Session }) {
  return (
    <>
      <Leaderboard session={session} />
      <Tables session={session} />
    </>
  )
}

function Final({ session }: { session: Session }) {
  const { t } = useI18n()

  return (
    <>
      <p className="px-1 text-sm font-semibold text-ink/55 dark:text-white/55">{t('liveFinished')}</p>
      {session.seats.length > 1 && <Podium table={standings(session)} />}
      <Watch session={session} />
    </>
  )
}
