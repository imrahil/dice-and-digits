import { useMemo, useState } from 'react'
import { Check, Shuffle } from 'lucide-react'
import { useI18n } from '../../i18n'
import { startSession } from '../../lib/games'
import { autoAssign, choosePawn, lastPawns, paletteFor } from '../../lib/pawns'
import { nextColor } from '../../lib/players'
import { getState, savePlayer, uid, useStore } from '../../lib/store'
import { buzz } from '../../lib/haptics'
import { navigate } from '../../hooks/useRoute'
import { toast } from '../dialogs'
import { BottomBar, Button, Page, Section } from '../ui'
import { AddPlayerForm } from './AddPlayerForm'
import { ChosenGameCard } from './ChosenGameCard'
import { PawnPicker } from './PawnPicker'
import { RosterChips } from './RosterChips'
import { SeatList } from './SeatList'
import { SetupOptions } from './SetupOptions'
import type { GameDef, Player } from '../../types'

/** Seats from the last time this game (or failing that, anything) was played. */
function lastLineup(gameId: string, roster: Record<string, Player>): string[] {
  const sessions = Object.values(getState().sessions)
    .filter((s) => !s.deleted)
    .sort((a, b) => b.startedAt - a.startedAt)
  const last = sessions.find((s) => s.gameId === gameId) ?? sessions[0]

  return last ? last.seats.map((s) => s.id).filter((id) => roster[id] && !roster[id].deleted) : []
}

export function Setup({ game }: { game: GameDef }) {
  const { t } = useI18n()
  const roster = useStore((s) => s.players)
  const players = useMemo(
    () => Object.values(roster).filter((p) => !p.deleted).sort((a, b) => a.name.localeCompare(b.name)),
    [roster],
  )
  const [seats, setSeatIds] = useState<string[]>(() => lastLineup(game.id, getState().players))
  const [lowWins, setLowWins] = useState(game.lowWins)
  const [target, setTarget] = useState(game.target ? String(game.target) : '')
  const [last] = useState(() => lastPawns(getState().sessions, game.id))
  const [usePawns, setUsePawns] = useState(() => !!game.pawns?.length || !!last)
  const [picked, setPicked] = useState<Record<string, string>>(() => last ?? {})
  const [pickFor, setPickFor] = useState<string | null>(null)
  const palette = paletteFor(game)
  const pawns = usePawns ? autoAssign(seats, palette, picked, last, roster) : {}

  // Freeze the pawns shown before seats change, so shuffling or removing a
  // player never recolours the others.
  const setSeats = (next: (s: string[]) => string[]) => {
    if (usePawns) {
      setPicked(pawns)
    }

    setSeatIds(next)
  }

  const pick = (hex: string) => {
    if (pickFor) {
      buzz()
      setPicked(choosePawn(pawns, pickFor, hex))
    }

    setPickFor(null)
  }

  const toggle = (id: string) => {
    buzz()
    setSeats((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  /** A typed name seats the saved player with that name, or saves a new one. */
  const addByName = (n: string) => {
    const existing = players.find((p) => p.name.toLocaleLowerCase() === n.toLocaleLowerCase())

    if (existing) {
      if (!seats.includes(existing.id)) {
        setSeats((s) => [...s, existing.id])
      }

      return
    }

    const p: Player = { id: uid(), name: n, color: nextColor(Object.values(roster)), updatedAt: Date.now() }

    savePlayer(p)
    setSeats((s) => [...s, p.id])
  }

  const shuffle = () => {
    buzz(15)
    setSeats((s) => {
      const a = [...s]

      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))

        ;[a[i], a[j]] = [a[j], a[i]]
      }

      return a
    })
  }

  const pickFirst = () => {
    if (seats.length < 2) {
      return
    }

    buzz([10, 40, 10])
    const i = Math.floor(Math.random() * seats.length)

    setSeats((s) => [...s.slice(i), ...s.slice(0, i)])
    toast(t('firstPlayerIs', { name: roster[seats[i]]?.name ?? '' }))
  }

  const start = () => {
    const chosen = seats.map((id) => roster[id]).filter(Boolean)

    if (!chosen.length) {
      return
    }

    const tgt = parseInt(target, 10)
    const s = startSession(game, chosen, {
      lowWins,
      target: Number.isFinite(tgt) && tgt > 0 ? tgt : undefined,
      pawns: usePawns ? pawns : undefined,
    })

    navigate(`play/${s.id}`, { replace: true })
  }

  const unselected = players.filter((p) => !seats.includes(p.id))

  return (
    <Page title={t('newGame')} back="" bare>
      <ChosenGameCard game={game} />

      <Section
        title={t('choosePlayers')}
        action={
          seats.length > 1 && (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={shuffle}>
                <Shuffle className="size-4" /> {t('shuffleSeats')}
              </Button>
            </div>
          )
        }
      >
        <AddPlayerForm onAdd={addByName} />

        {seats.length > 0 && <SeatList seats={seats} roster={roster} pawns={pawns} onPickPawn={setPickFor} onRemove={toggle} />}

        {seats.length > 1 && (
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={pickFirst}>
            🎯 {t('pickFirst')}
          </Button>
        )}

        {unselected.length > 0 ? (
          <RosterChips players={unselected} onAdd={toggle} />
        ) : (
          players.length === 0 && <p className="mt-3 text-sm text-ink/55 dark:text-white/55">{t('rosterEmpty')}</p>
        )}
      </Section>

      <Section title={t('options')}>
        <SetupOptions lowWins={lowWins} onLowWins={setLowWins} target={target} onTarget={setTarget} usePawns={usePawns} onUsePawns={setUsePawns} />
      </Section>

      <PawnPicker playerId={pickFor} palette={palette} pawns={pawns} roster={roster} onPick={pick} onClose={() => setPickFor(null)} />

      <BottomBar>
        <Button variant="primary" size="lg" className="flex-1" disabled={!seats.length} onClick={start}>
          <Check className="size-6" strokeWidth={3} />
          {seats.length ? t('startGame') : t('needPlayers')}
        </Button>
      </BottomBar>
    </Page>
  )
}
