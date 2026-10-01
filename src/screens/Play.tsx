import { useEffect, useMemo, useState } from 'react'
import { Flag, MoreVertical, Plus, QrCode, Radio, Smartphone, Trash2, Undo2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { cloudEnabled, forgetLive, liveHandle, liveLink, pushLive, startLive, stopLive } from '../lib/cloud'
import { nextRound } from '../lib/ops'
import { hostScorer } from '../lib/scorer'
import { isEmpty, standings, targetReached } from '../lib/scoring'
import { removeSession, updateSession, useStore } from '../lib/store'
import { buzz } from '../lib/haptics'
import { navigate } from '../hooks/useRoute'
import { useNow } from '../hooks/useNow'
import { useWakeLock } from '../hooks/useWakeLock'
import { useLiveHost, type HostRoom } from '../hooks/useLiveHost'
import { confirm, toast } from '../components/dialogs'
import { QrShareSheet } from '../components/QrShare'
import { CounterBoard } from '../components/play/CounterBoard'
import { RoundsBoard } from '../components/play/RoundsBoard'
import { SheetBoard } from '../components/play/SheetBoard'
import { WinnerBoard } from '../components/play/WinnerBoard'
import { Avatar, BottomBar, Button, Empty, IconButton, Page, Sheet, cx } from '../components/ui'
import type { Session } from '../types'

export function Play({ id }: { id: string }) {
  const session = useStore((s) => s.sessions[id])
  const done = Boolean(session?.finishedAt)
  useEffect(() => {
    if (done) navigate(`result/${id}`, { replace: true })
  }, [done, id])
  if (!session || session.deleted) {
    return (
      <Page back="">
        <Empty icon="🤷" title="404" />
      </Page>
    )
  }
  if (done) return null
  return <Board key={id} session={session} />
}

function Board({ session }: { session: Session }) {
  const { t, text, duration } = useI18n()
  const keepAwake = useStore((s) => s.settings.keepAwake)
  const now = useNow(15000)
  const [menu, setMenu] = useState(false)
  const [entry, setEntry] = useState<number | null>(null)
  const [live, setLive] = useState(() => liveHandle(session.id))
  const [qr, setQr] = useState(false)
  const scorer = useMemo(() => hostScorer(session.id), [session.id])
  useWakeLock(keepAwake)

  // While live, this phone is the room's host: it applies players' ops and mirrors every change.
  const room = useLiveHost(session, live, () => {
    forgetLive(session.id)
    setLive(undefined)
    setQr(false)
  })

  const mode = session.rules.mode
  const reached = targetReached(session)
  const leader = standings(session)[0]

  const finish = async () => {
    const msg = isEmpty(session) ? t('finishEmpty') : t('finishConfirm')
    if (!(await confirm(msg, { confirmLabel: t('finishGame') }))) return
    buzz([20, 60, 40])
    const done = { ...session, finishedAt: Date.now() }
    updateSession(session.id, () => done)
    if (live) pushLive(done) // everyone following sees the final result; the room expires on its own
    navigate(`result/${session.id}`, { replace: true })
  }

  const discard = async () => {
    setMenu(false)
    if (!(await confirm(t('abandonConfirm'), { confirmLabel: t('abandonGame'), danger: true }))) return
    if (live) stopLive(session.id)
    removeSession(session.id)
    navigate('', { replace: true })
  }

  const undo = () => {
    buzz()
    updateSession(session.id, (s) => (mode === 'winner' ? { ...s, rounds: s.rounds.slice(0, -1) } : { ...s, log: s.log.slice(0, -1) }))
  }
  const canUndo = mode === 'winner' ? session.rounds.length > 0 : session.log.length > 0

  const goLive = async () => {
    setMenu(false)
    if (live) return setQr(true)
    try {
      setLive(await startLive(session))
      setQr(true)
    } catch {
      toast(t('liveError'))
    }
  }

  const endLive = async () => {
    await stopLive(session.id)
    setLive(undefined)
    setMenu(false)
    setQr(false)
  }

  return (
    <Page
      back=""
      title={
        <span className="flex items-center gap-2">
          <span>{session.emoji}</span>
          <span className="truncate">{text(session.rules.name)}</span>
        </span>
      }
      actions={
        <>
          {live && (
            <button
              onClick={() => setQr(true)}
              className={cx(
                'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black text-white',
                room.status === 'open' ? 'bg-danger' : 'bg-ink/40 dark:bg-white/25',
              )}
              aria-label={t('liveSharing')}
            >
              <span className={cx('size-1.5 rounded-full bg-white', room.status === 'open' && 'animate-pulse')} /> LIVE
              {room.guests > 0 && (
                <span className="ml-0.5 flex items-center gap-0.5">
                  <Smartphone className="size-3" strokeWidth={3} />
                  {room.guests}
                </span>
              )}
            </button>
          )}
          <span className="px-1 text-sm font-bold text-ink/50 tabular-nums dark:text-white/50">
            {duration(now - session.startedAt)}
          </span>
          {(mode === 'counter' || mode === 'winner') && (
            <IconButton label={t('undo')} onClick={undo} disabled={!canUndo} className="disabled:opacity-30">
              <Undo2 className="size-5" />
            </IconButton>
          )}
          <IconButton label="Menu" onClick={() => setMenu(true)}>
            <MoreVertical className="size-5" />
          </IconButton>
        </>
      }
      bare
    >
      {reached && leader && (
        <button
          onClick={finish}
          className="mb-3 flex w-full animate-pop items-center gap-3 rounded-2xl bg-gold/20 px-4 py-3 text-left font-bold"
        >
          <Flag className="size-5 shrink-0 text-gold" />
          <span className="flex-1">
            {t('targetReachedBanner', {
              name: standings(session).find((r) => r.total >= session.rules.target!)?.seat.name ?? leader.seat.name,
              target: session.rules.target!,
            })}
          </span>
          <span className="text-accent">{t('finishGame')} →</span>
        </button>
      )}

      {mode === 'counter' && <CounterBoard session={session} scorer={scorer} />}
      {mode === 'rounds' && <RoundsBoard session={session} scorer={scorer} entry={entry} setEntry={setEntry} />}
      {mode === 'sheet' && <SheetBoard session={session} scorer={scorer} />}
      {mode === 'winner' && <WinnerBoard session={session} scorer={scorer} />}

      <BottomBar>
        {mode === 'rounds' ? (
          <>
            <Button size="lg" onClick={finish} aria-label={t('finishGame')} className="shrink-0 !px-4">
              <Flag className="size-5" />
            </Button>
            <Button variant="primary" size="lg" className="flex-1" onClick={() => setEntry(nextRound(session))}>
              <Plus className="size-6" strokeWidth={3} /> {t('addRound')}
            </Button>
          </>
        ) : (
          <Button variant="primary" size="lg" className="flex-1" onClick={finish}>
            <Flag className="size-5" strokeWidth={2.5} /> {t('finishGame')}
          </Button>
        )}
      </BottomBar>

      <Sheet open={menu} onClose={() => setMenu(false)} title={text(session.rules.name)}>
        <div className="space-y-2">
          {cloudEnabled && (
            <>
              <Button className="w-full !justify-start" onClick={goLive}>
                {live ? <QrCode className="size-5" /> : <Radio className="size-5" />}
                {live ? t('liveSharing') : t('liveShare')}
              </Button>
              {live && (
                <Button variant="ghost" className="w-full !justify-start" onClick={endLive}>
                  <Radio className="size-5" /> {t('liveStop')}
                </Button>
              )}
              <p className="px-1 pb-2 text-sm text-ink/55 dark:text-white/55">{t('liveHint')}</p>
            </>
          )}
          <Button className="w-full !justify-start" onClick={() => (setMenu(false), finish())}>
            <Flag className="size-5" /> {t('finishGame')}
          </Button>
          <Button variant="danger" className="w-full !justify-start" onClick={discard}>
            <Trash2 className="size-5" /> {t('abandonGame')}
          </Button>
        </div>
      </Sheet>

      {live && (
        <QrShareSheet
          open={qr}
          onClose={() => setQr(false)}
          title={`${session.emoji} ${text(session.rules.name)}`}
          caption={t('scanToFollow')}
          url={liveLink(live.code)}
          code={live.code}
        >
          <JoinedSeats session={session} room={room} onStop={endLive} />
        </QrShareSheet>
      )}
    </Page>
  )
}

/** Who scores from their own phone; the host can free a seat (e.g. a dead battery). */
function JoinedSeats({ session, room, onStop }: { session: Session; room: HostRoom; onStop: () => void }) {
  const { t, tp } = useI18n()
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <h3 className="text-xs font-extrabold tracking-wide text-ink/50 uppercase dark:text-white/50">{t('playersOnPhones')}</h3>
        <span className="text-xs font-bold text-ink/50 dark:text-white/50">{tp('nPhones', room.guests)}</span>
      </div>
      <div className="space-y-1.5">
        {session.seats.map((s) => {
          const joined = room.seats[s.id]
          return (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-card px-2 py-1.5 ring-1 ring-edge dark:bg-night dark:ring-white/8">
              <Avatar name={s.name} color={s.color} size="sm" />
              <span className="min-w-0 flex-1 truncate font-bold">{s.name}</span>
              {joined ? (
                <>
                  <Smartphone className="size-4 text-mint" />
                  <Button size="sm" variant="ghost" onClick={() => room.release(s.id)}>
                    {t('freeSeat')}
                  </Button>
                </>
              ) : (
                <span className="pr-2 text-xs font-semibold text-ink/45 dark:text-white/45">{t('notJoined')}</span>
              )}
            </div>
          )
        })}
      </div>
      <Button variant="ghost" className="mt-3 w-full" onClick={onStop}>
        <Radio className="size-5" /> {t('liveStop')}
      </Button>
    </div>
  )
}
