import { useEffect, useState } from 'react'
import { CloudOff, Loader2, Plus, Radio } from 'lucide-react'
import { useI18n } from '../../i18n'
import { nextRoundFor } from '../../lib/ops'
import { useNow } from '../../hooks/useNow'
import { useRoom } from '../../hooks/useRoom'
import { toast } from '../dialogs'
import { Avatar, BottomBar, Button, Card, Empty, Page } from '../ui'
import { seatColor } from '../../lib/pawns'
import { Final } from './Final'
import { GuestBoard } from './GuestBoard'
import { SeatPicker } from './SeatPicker'
import { StatusPill } from './StatusPill'
import { Watch } from './Watch'

const NOTICE = {
  taken: 'noticeTaken',
  rejected: 'noticeRejected',
  finished: 'noticeFinished',
  full: 'noticeFull',
} as const

export function LiveRoom({ code }: { code: string }) {
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
            <Avatar name={me.name} color={seatColor(me)} />
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
