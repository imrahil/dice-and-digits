import { useState } from 'react'
import { ChevronRight, Plus, ScanLine } from 'lucide-react'
import { useI18n } from '../i18n'
import { allGames, recentGameIds, useActiveSessions } from '../lib/games'
import { finished } from '../lib/stats'
import { useStore } from '../lib/store'
import { cloudEnabled } from '../lib/cloud'
import { navigate } from '../hooks/useRoute'
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

export function Home() {
  const { t, text } = useI18n()
  const sessions = useStore((s) => s.sessions)
  const custom = useStore((s) => s.games)
  const active = useActiveSessions()
  const recent = finished(Object.values(sessions)).slice(0, 3)

  const [joining, setJoining] = useState(false)
  const games = allGames(custom)
  const recentIds = recentGameIds(sessions)
  const quick = (recentIds.length ? recentIds : STARTERS)
    .map((id) => games.find((g) => g.id === id))
    .filter((g) => g !== undefined)

  return (
    <Page>
      <div className="flex items-center gap-3 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-2">
        <Logo className="size-16 shrink-0 -rotate-6" />
        <div className="min-w-0">
          <h1 className="text-[34px] leading-[0.95] font-extrabold">{t('appName')}</h1>
          <p className="chip-on mt-2 inline-block -rotate-2 rounded-full px-3 py-0.5 text-sm font-bold">{t('tagline')}</p>
        </div>
      </div>

      <Button variant="primary" size="lg" className="mt-6 h-16 w-full !rounded-3xl !text-xl" onClick={() => navigate('new')}>
        <Plus className="size-7" strokeWidth={3} />
        {t('newGame')}
      </Button>
      {cloudEnabled && (
        <Button variant="secondary" className="mt-3 w-full" onClick={() => setJoining(true)}>
          <ScanLine className="size-5" /> {t('joinGame')}
        </Button>
      )}
      <JoinByCode open={joining} onClose={() => setJoining(false)} />

      {active.length > 0 && (
        <Section title={t('inProgress')}>
          <div className="space-y-2">
            {active.map((s) => (
              <SessionRow key={s.id} session={s} onClick={() => navigate(`play/${s.id}`)} />
            ))}
          </div>
        </Section>
      )}

      <Section title={recentIds.length ? t('quickStart') : t('builtinGames')}>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pt-1 pb-2 [scrollbar-width:none]">
          {quick.map((g, i) => (
            <button
              key={g.id}
              onClick={() => navigate(`new/${encodeURIComponent(g.id)}`)}
              className={cx(
                'surface press my-1 flex w-24 shrink-0 snap-start flex-col items-center gap-1.5 rounded-3xl px-2 py-3 text-ink',
                CANDY[i % CANDY.length],
                i % 2 ? 'rotate-2' : '-rotate-2',
              )}
            >
              <span className="text-4xl drop-shadow-[0_2px_0_rgb(0_0_0/0.12)]">{g.emoji}</span>
              <span className="line-clamp-2 text-center text-xs leading-tight font-bold">{text(g.name)}</span>
            </button>
          ))}
        </div>
      </Section>

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
        active.length === 0 && (
          <Empty icon="🎲" title={t('emptyHomeTitle')}>
            {t('emptyHomeBody')}
          </Empty>
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
