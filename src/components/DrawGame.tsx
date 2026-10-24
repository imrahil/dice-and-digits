import { useEffect, useRef, useState } from 'react'
import { Play as PlayIcon, Shuffle } from 'lucide-react'
import { useI18n } from '../i18n'
import { drawGame } from '../lib/games'
import { buzz } from '../lib/haptics'
import { navigate } from '../hooks/useRoute'
import { ModeBadge } from './ModeBadge'
import { Button, Sheet, cx } from './ui'
import type { GameDef } from '../types'

/** Frames the reel shows before it stops; each one waits a little longer. */
const FRAMES = 14

const frameDelay = (i: number) => 40 + 1.2 * i * i

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** "What do we play tonight?": spins through My shelf and lands on one. */
export function DrawSheet({ open, onClose, games }: { open: boolean; onClose: () => void; games: GameDef[] }) {
  const { t } = useI18n()

  return (
    <Sheet open={open} onClose={onClose} title={`🎲 ${t('drawTitle')}`}>
      <Reel games={games} onClose={onClose} />
    </Sheet>
  )
}

function Reel({ games: initial, onClose }: { games: GameDef[]; onClose: () => void }) {
  const { t, tp, text } = useI18n()
  // The pool is fixed while the sheet is open, so a re-render never restarts the spin.
  const [games] = useState(initial)
  const [shown, setShown] = useState<GameDef | undefined>(games[0])
  const [spinning, setSpinning] = useState(true)
  const [round, setRound] = useState(0)
  const last = useRef<string>(undefined)

  // Every round picks the winner up front, then shuffles other games past it.
  useEffect(() => {
    const pick = drawGame(games, last.current)

    if (!pick) {
      return
    }

    last.current = pick.id
    const timers: ReturnType<typeof setTimeout>[] = []
    const spin = games.length > 1 && !reducedMotion()
    let at = 0
    let prev = pick.id

    for (let i = 0; spin && i < FRAMES; i++) {
      // Never the same game twice in a row, and not the winner right before it lands.
      const others = games.filter((g) => g.id !== prev && (i < FRAMES - 1 || g.id !== pick.id))
      const frame = others[Math.floor(Math.random() * others.length)] ?? pick

      prev = frame.id
      at += frameDelay(i)
      timers.push(
        setTimeout(() => {
          setShown(frame)
          buzz(4)
        }, at),
      )
    }

    timers.push(
      setTimeout(() => {
        setShown(pick)
        setSpinning(false)
        buzz([20, 40, 60])
      }, spin ? at + frameDelay(FRAMES) : 0),
    )

    return () => timers.forEach(clearTimeout)
  }, [games, round])

  const again = () => {
    setSpinning(true)
    setRound((r) => r + 1)
  }

  const play = () => {
    if (!shown) {
      return
    }

    onClose()
    navigate(`new/${encodeURIComponent(shown.id)}`)
  }

  return (
    <div>
      <p className="mb-4 text-sm text-ink/60 dark:text-white/60">{t('drawFrom', { games: tp('nGames', games.length) })}</p>
      <div className="surface flex flex-col items-center rounded-3xl px-4 py-6 text-center" aria-live="polite">
        {shown && (
          <>
            <span
              key={spinning ? shown.id : `won:${shown.id}`}
              className={cx(
                'flex size-24 items-center justify-center emoji-tile rounded-[28px] text-6xl',
                spinning ? 'opacity-80' : 'animate-roll',
              )}
            >
              {shown.emoji}
            </span>
            <span data-testid="drawn-game" className={cx('display mt-4 line-clamp-2 text-2xl font-extrabold', spinning && 'opacity-60')}>{text(shown.name)}</span>
            <span className={cx('flex min-h-5 justify-center', spinning && 'invisible')}>
              <ModeBadge mode={shown.mode} target={shown.target} lowWins={shown.lowWins} />
            </span>
          </>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button size="lg" onClick={again} disabled={spinning || games.length < 2}>
          <Shuffle className="size-5" /> {t('drawAgain')}
        </Button>
        <Button variant="primary" size="lg" onClick={play} disabled={spinning}>
          <PlayIcon className="size-5" /> {t('playThis')}
        </Button>
      </div>
    </div>
  )
}
