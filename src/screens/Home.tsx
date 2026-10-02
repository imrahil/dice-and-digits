import { useState } from 'react'
import { ChevronRight, KeyRound, Plus, ScanLine } from 'lucide-react'
import { useI18n } from '../i18n'
import { allGames, recentGameIds, useActiveSessions } from '../lib/games'
import { finished } from '../lib/stats'
import { useStore } from '../lib/store'
import { cloudEnabled, useCloud } from '../lib/cloud'
import { navigate } from '../hooks/useRoute'
import { ActiveGameCard } from '../components/ActiveGameCard'
import { SessionRow } from '../components/SessionRow'
import { Logo } from '../components/Logo'
import { Button, Empty, Page, Section, Sheet, cx, inputClass } from '../components/ui'

/** Shown before anything has been played: a mix of every scoring mode. */
const STARTERS = [
  'builtin:6nimmt',
  'builtin:ttr-europe',
  'builtin:splendor',
  'builtin:rummikub',
  'builtin:dream-home',
  'builtin:exploding-kittens',
  'builtin:1000',
  'builtin:7wonders',
]

/** Quick-start tiles cycle through the skin's candy colours. */
const CANDY = ['!bg-candy-a', '!bg-candy-b', '!bg-candy-c', '!bg-candy-d', '!bg-candy-e']

/** Quick start fills two rows of four. */
const QUICK = 8

export function Home() {
  const { t, text } = useI18n()
  const sessions = useStore((s) => s.sessions)
  const custom = useStore((s) => s.games)
  const active = useActiveSessions()
  const { group } = useCloud()
  const recent = finished(Object.values(sessions)).slice(0, 3)

  const [joining, setJoining] = useState(false)
  const games = allGames(custom)
  const recentIds = recentGameIds(sessions, QUICK)
  // Recently played first, topped up with the starters so both rows stay full.
  const quick = [...new Set([...recentIds, ...STARTERS])]
    .map((id) => games.find((g) => g.id === id))
    .filter((g) => g !== undefined)
    .slice(0, QUICK)
  // The game started last gets the big card; any others are listed further down.
  const [current, ...others] = [...active].sort((a, b) => b.startedAt - a.startedAt)

  return (
    <Page>
      <div className="flex items-center gap-2.5 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <Logo className="size-10 shrink-0 -rotate-6" />
        <h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold">{t('appName')}</h1>
        {cloudEnabled && (
          <Button className="!px-3" onClick={() => setJoining(true)} aria-label={t('joinGame')} title={t('joinGame')}>
            <ScanLine className="size-5" />
          </Button>
        )}
      </div>
      <JoinByCode open={joining} onClose={() => setJoining(false)} />

      {current ? (
        <>
          <div className="mt-4">
            <ActiveGameCard session={current} />
          </div>
          <Button size="lg" className="mt-4 w-full" onClick={() => navigate('new')}>
            <Plus className="size-6" strokeWidth={3} />
            {t('newGame')}
          </Button>
        </>
      ) : (
        <Button variant="primary" size="lg" className="mt-4 h-16 w-full !rounded-3xl !text-xl" onClick={() => navigate('new')}>
          <Plus className="size-7" strokeWidth={3} />
          {t('newGame')}
        </Button>
      )}

      <Section title={recentIds.length ? t('quickStart') : t('builtinGames')}>
        <div className="grid grid-cols-4 gap-2.5">
          {quick.map((g, i) => (
            <button
              key={g.id}
              onClick={() => navigate(`new/${encodeURIComponent(g.id)}`)}
              className={cx(
                'surface press flex h-21 flex-col items-center justify-center gap-1 rounded-3xl px-1 text-ink',
                CANDY[i % CANDY.length],
              )}
            >
              <span className="text-[28px] leading-none drop-shadow-[0_2px_0_rgb(0_0_0/0.12)]">{g.emoji}</span>
              <span className="line-clamp-2 text-center text-xs leading-tight font-bold">{text(g.name)}</span>
            </button>
          ))}
        </div>
      </Section>

      {others.length > 0 && (
        <Section title={t('inProgress')}>
          <div className="space-y-2">
            {others.map((s) => (
              <SessionRow key={s.id} session={s} onClick={() => navigate(`play/${s.id}`)} />
            ))}
          </div>
        </Section>
      )}

      {recent.length > 0 ? (
        <Section
          title={t('recentResults')}
          action={
            <button onClick={() => navigate('history')} className="flex items-center text-sm font-bold text-accent">
              {t('seeAll')} <ChevronRight className="size-4" />
            </button>
          }
        >
          <div className="space-y-2">
            {recent.map((s) => (
              <SessionRow key={s.id} session={s} onClick={() => navigate(`result/${s.id}`)} />
            ))}
          </div>
        </Section>
      ) : (
        !current && (
          <>
            <Empty icon="🎲" title={t('emptyHomeTitle')}>
              {t('emptyHomeBody')}
            </Empty>
            {cloudEnabled && !group && (
              <Button variant="ghost" size="sm" className="mx-auto flex" onClick={() => navigate('restore')}>
                <KeyRound className="size-4" /> {t('restoreFromPhone')}
              </Button>
            )}
          </>
        )
      )}
    </Page>
  )
}

/** For when the camera won't scan: type the code shown under the host's QR. */
function JoinByCode({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const valid = /^[A-Z2-9]{6}$/.test(code)

  return (
    <Sheet open={open} onClose={onClose} title={t('joinGame')}>
      <p className="mb-3 text-sm text-ink/60 dark:text-white/60">{t('enterCode')}</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()

          if (!valid) {
            return
          }

          onClose()
          navigate(`live/${code}`)
        }}
      >
        <input
          className={cx(inputClass, 'text-center font-mono text-2xl tracking-[0.3em] uppercase')}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="ABC234"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          autoFocus
          aria-label={t('gameCode')}
        />
        <Button type="submit" variant="primary" className="!h-12 shrink-0" disabled={!valid}>
          {t('join')}
        </Button>
      </form>
    </Sheet>
  )
}
