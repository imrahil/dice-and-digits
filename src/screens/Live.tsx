import { useEffect, useState } from 'react'
import { Crown, Radio } from 'lucide-react'
import { useI18n } from '../i18n'
import { cloudEnabled, fetchLive, type LivePayload } from '../lib/cloud'
import { standings } from '../lib/scoring'
import { useNow } from '../hooks/useNow'
import { RoundsTable } from '../components/play/RoundsBoard'
import { SheetTable } from '../components/play/SheetBoard'
import { Avatar, Card, Empty, Page, Section, cx } from '../components/ui'
import { Podium } from './Result'

const POLL_MS = 4000

/** Read-only scoreboard for friends following along on their own phones. */
export function Live({ code }: { code: string }) {
  const { t, text, num, ago } = useI18n()
  const [data, setData] = useState<{ payload: LivePayload; updatedAt: number } | null>(null)
  const [missing, setMissing] = useState(false)
  useNow(10000)

  const finished = Boolean(data?.payload.session.finishedAt)

  useEffect(() => {
    if (!cloudEnabled || !code || finished) return
    let stop = false
    const load = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const r = await fetchLive(code)
        if (!stop) {
          setData({ payload: r.data, updatedAt: r.updatedAt })
          setMissing(false)
        }
      } catch (e) {
        if (!stop && e instanceof Error && /not found/i.test(e.message)) setMissing(true)
      }
    }
    load()
    const id = setInterval(load, POLL_MS)
    document.addEventListener('visibilitychange', load)
    return () => {
      stop = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', load)
    }
  }, [code, finished])

  if (!cloudEnabled || (missing && !data)) {
    return (
      <Page title={t('liveTitle')} back="">
        <Empty icon="📡">{cloudEnabled ? t('liveNotFound') : t('cloudUnavailable')}</Empty>
      </Page>
    )
  }
  if (!data) {
    return (
      <Page title={t('liveTitle')} back="">
        <div className="flex justify-center py-20">
          <Radio className="size-10 animate-pulse text-accent" />
        </div>
      </Page>
    )
  }

  const s = data.payload.session
  const table = standings(s)
  const anyScore = table.some((r) => r.total !== 0)

  return (
    <Page
      back=""
      title={
        <span className="flex items-center gap-2">
          {s.emoji} <span className="truncate">{text(s.rules.name)}</span>
        </span>
      }
      actions={
        !finished && (
          <span className="flex items-center gap-1 rounded-full bg-danger px-2.5 py-1 text-xs font-black text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" /> LIVE
          </span>
        )
      }
      bare
    >
      <p className="px-1 text-sm font-semibold text-ink/55 dark:text-white/55">
        {finished ? t('liveFinished') : t('liveUpdated', { time: ago(data.updatedAt) })}
      </p>

      {finished && s.seats.length > 1 && <Podium table={table} />}

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

      {s.rules.mode === 'rounds' && s.rounds.length > 0 && (
        <Section title={t('modeRounds')}>
          <RoundsTable session={s} />
        </Section>
      )}
      {s.rules.mode === 'sheet' && (
        <Section title={t('modeSheet')}>
          <SheetTable session={s} />
        </Section>
      )}
    </Page>
  )
}
