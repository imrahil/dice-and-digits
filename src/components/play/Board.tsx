import { useMemo, useState } from 'react'
import { MoreVertical, Undo2 } from 'lucide-react'
import { useI18n } from '../../i18n'
import { pushLive, stopLive } from '../../lib/cloud'
import { hostScorer } from '../../lib/scorer'
import { isHotPotato } from '../../lib/games'
import { isEmpty, standings, targetReached } from '../../lib/scoring'
import { counterViewOf, removeSession, setCounterView, updateSession, useStore } from '../../lib/store'
import { buzz } from '../../lib/haptics'
import { navigate } from '../../hooks/useRoute'
import { useNow } from '../../hooks/useNow'
import { useWakeLock } from '../../hooks/useWakeLock'
import { useHotPotatoRound } from '../../hooks/useHotPotatoRound'
import { useLiveShare } from '../../hooks/useLiveShare'
import { confirm, toast } from '../dialogs'
import { IconButton, Page } from '../ui'
import { CounterBoard } from './CounterBoard'
import { RoundsBoard } from './RoundsBoard'
import { SheetBoard } from './SheetBoard'
import { WinnerBoard } from './WinnerBoard'
import { BoardBottomBar } from './board/BoardBottomBar'
import { BoardMenu } from './board/BoardMenu'
import { LiveBadge } from './board/LiveBadge'
import { LiveQrSheet } from './board/LiveQrSheet'
import { TableToolbar } from './board/TableToolbar'
import { TargetBanner } from './board/TargetBanner'
import type { CounterView, Session } from '../../types'

export function Board({ session }: { session: Session }) {
  const { t, tp, text, num, duration } = useI18n()
  const keepAwake = useStore((s) => s.settings.keepAwake)
  const now = useNow(15000)
  const [menu, setMenu] = useState(false)
  const [entry, setEntry] = useState<number | null>(null)
  const share = useLiveShare(session)
  const scorer = useMemo(() => hostScorer(session.id), [session.id])

  useWakeLock(keepAwake)

  const mode = session.rules.mode
  const timer = mode === 'winner' ? session.rules.timer : undefined
  // Hot Potato: the round clock lives here so the bottom bar can drive it.
  const round = useHotPotatoRound(timer)
  const view = mode === 'counter' ? counterViewOf(session) : undefined
  const reached = targetReached(session)
  const leader = standings(session)[0]
  const reachedName = reached
    ? (standings(session).find((r) => r.total >= session.rules.target!)?.seat.name ?? leader?.seat.name ?? '')
    : ''
  const elapsed = duration(now - session.startedAt)

  const finish = async () => {
    const msg = isEmpty(session) ? t('finishEmpty') : t('finishConfirm')

    if (!(await confirm(msg, { confirmLabel: t('finishGame') }))) {
      return
    }

    buzz([20, 60, 40])
    const done = { ...session, finishedAt: Date.now() }

    updateSession(session.id, () => done)

    if (share.live) {
      // everyone following sees the final result; the room expires on its own
      pushLive(done)
    }

    navigate(`result/${session.id}`, { replace: true })
  }

  const discard = async () => {
    setMenu(false)

    if (!(await confirm(t('abandonConfirm'), { confirmLabel: t('abandonGame'), danger: true }))) {
      return
    }

    if (share.live) {
      stopLive(session.id)
    }

    removeSession(session.id)
    navigate('', { replace: true })
  }

  const undo = () => {
    buzz()
    round.reset()
    updateSession(session.id, (s) => (mode === 'winner' ? { ...s, rounds: s.rounds.slice(0, -1) } : { ...s, log: s.log.slice(0, -1) }))
  }

  const canUndo = mode === 'winner' ? session.rounds.length > 0 : session.log.length > 0

  const goLive = async () => {
    setMenu(false)

    try {
      await share.start()
    } catch {
      toast(t('liveError'))
    }
  }

  const endLive = async () => {
    await share.stop()
    setMenu(false)
  }

  const pickView = (v: CounterView) => {
    setCounterView(session.id, v)
    setMenu(false)

    if (v === 'table') {
      toast(t('viewTableHint'))
    }
  }

  const liveBadge = share.live && <LiveBadge room={share.room} onClick={share.showQr} />

  const qrSheet = share.live && (
    <LiveQrSheet session={session} live={share.live} room={share.room} open={share.qr} onClose={share.hideQr} onStop={endLive} />
  )

  if (view === 'table') {
    return (
      <>
        <CounterBoard
          session={session}
          scorer={scorer}
          toolbar={
            <TableToolbar
              session={session}
              elapsed={elapsed}
              reachedName={reached ? reachedName : undefined}
              badge={liveBadge}
              canUndo={canUndo}
              onUndo={undo}
              onFinish={finish}
            />
          }
        />
        {qrSheet}
      </>
    )
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
      subtitle={
        timer
          ? t(isHotPotato(session) && session.rules.lowWins ? 'potatoSubtitle' : 'timerSubtitle', { n: session.rounds.length + 1, min: timer.min, max: timer.max })
          : mode === 'rounds' &&
        [
          tp('nRounds', session.rounds.length),
          elapsed,
          session.rules.target != null && t('toTargetValue', { n: num(session.rules.target) }),
        ]
          .filter(Boolean)
          .join(' · ')
      }
      actions={
        <>
          {liveBadge}
          {mode !== 'rounds' && !timer && (
            <span className="px-1 text-sm font-bold text-ink/50 tabular-nums dark:text-white/50">{elapsed}</span>
          )}
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
      {reached && leader && <TargetBanner name={reachedName} target={session.rules.target!} onFinish={finish} />}

      {mode === 'counter' && <CounterBoard session={session} scorer={scorer} />}
      {mode === 'rounds' && <RoundsBoard session={session} scorer={scorer} entry={entry} setEntry={setEntry} />}
      {mode === 'sheet' && <SheetBoard session={session} scorer={scorer} />}
      {mode === 'winner' && <WinnerBoard session={session} scorer={scorer} round={round} />}

      <BoardBottomBar session={session} round={round} onFinish={finish} onNewRound={setEntry} />

      <BoardMenu
        open={menu}
        onClose={() => setMenu(false)}
        session={session}
        view={view}
        live={!!share.live}
        onPickView={pickView}
        onGoLive={goLive}
        onEndLive={endLive}
        onFinish={() => (setMenu(false), finish())}
        onDiscard={discard}
      />

      {qrSheet}
    </Page>
  )
}
