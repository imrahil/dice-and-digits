import { useEffect, useState } from 'react'
import { Flag, MoreVertical, Plus, Radio, Share2, Trash2, Undo2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { cloudEnabled, liveHandle, liveLink, pushLive, startLive, stopLive } from '../lib/cloud'
import { isEmpty, standings, targetReached } from '../lib/scoring'
import { removeSession, updateSession, useStore } from '../lib/store'
import { buzz } from '../lib/haptics'
import { navigate } from '../hooks/useRoute'
import { useNow } from '../hooks/useNow'
import { useWakeLock } from '../hooks/useWakeLock'
import { confirm, toast } from '../components/dialogs'
import { CounterBoard } from '../components/play/CounterBoard'
import { RoundsBoard } from '../components/play/RoundsBoard'
import { SheetBoard } from '../components/play/SheetBoard'
import { BottomBar, Button, Empty, IconButton, Page, Sheet } from '../components/ui'
import type { Session } from '../types'

export async function shareLink(url: string, title: string, copied: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  await navigator.clipboard?.writeText(url)
  toast(copied)
}

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
  useWakeLock(keepAwake)

  // Mirror every change to the live scoreboard, debounced.
  useEffect(() => {
    if (!live) return
    const id = setTimeout(() => pushLive(session), 700)
    return () => clearTimeout(id)
  }, [session, live])

  const mode = session.rules.mode
  const reached = targetReached(session)
  const leader = standings(session)[0]

  const finish = async () => {
    const msg = isEmpty(session) ? t('finishEmpty') : t('finishConfirm')
    if (!(await confirm(msg, { confirmLabel: t('finishGame') }))) return
    buzz([20, 60, 40])
    const done = { ...session, finishedAt: Date.now() }
    updateSession(session.id, () => done)
    if (live) pushLive(done) // viewers see the final result; the cron sweeps it later
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
    updateSession(session.id, (s) => ({ ...s, log: s.log.slice(0, -1) }))
  }

  const toggleLive = async () => {
    if (live) {
      await shareLink(liveLink(live.code), text(session.rules.name), t('linkCopied'))
      return
    }
    try {
      const h = await startLive(session)
      setLive(h)
      setMenu(false)
      await shareLink(liveLink(h.code), text(session.rules.name), t('linkCopied'))
    } catch {
      toast(t('liveError'))
    }
  }

  const endLive = async () => {
    await stopLive(session.id)
    setLive(undefined)
    setMenu(false)
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
              onClick={toggleLive}
              className="flex items-center gap-1 rounded-full bg-danger px-2.5 py-1 text-xs font-black text-white"
              aria-label={t('liveSharing')}
            >
              <span className="size-1.5 animate-pulse rounded-full bg-white" /> LIVE
            </button>
          )}
          <span className="px-1 text-sm font-bold text-ink/50 tabular-nums dark:text-white/50">
            {duration(now - session.startedAt)}
          </span>
          {mode === 'counter' && (
            <IconButton label={t('undo')} onClick={undo} disabled={!session.log.length} className="disabled:opacity-30">
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

      {mode === 'counter' && <CounterBoard session={session} />}
      {mode === 'rounds' && <RoundsBoard session={session} entry={entry} setEntry={setEntry} />}
      {mode === 'sheet' && <SheetBoard session={session} />}

      <BottomBar>
        {mode === 'rounds' ? (
          <>
            <Button size="lg" onClick={finish} aria-label={t('finishGame')} className="shrink-0 !px-4">
              <Flag className="size-5" />
            </Button>
            <Button variant="primary" size="lg" className="flex-1" onClick={() => setEntry(session.rounds.length)}>
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
              <Button className="w-full !justify-start" onClick={toggleLive}>
                {live ? <Share2 className="size-5" /> : <Radio className="size-5" />}
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
    </Page>
  )
}
