import { useState } from 'react'
import { useI18n } from '../i18n'
import { fitsPlayers, lastTableSize } from '../lib/games'
import { getState } from '../lib/store'
import { DrawReel } from './DrawReel'
import { PLAYER_COUNTS, PlayerCountPicker } from './PlayerCountPicker'
import type { GameDef } from '../types'

/** Tonight's table size, starting from the last game's: 2–7+, or null for any. */
function startingCount(): number | null {
  const n = lastTableSize(getState().sessions)

  return n && n >= PLAYER_COUNTS[0] ? Math.min(n, PLAYER_COUNTS[PLAYER_COUNTS.length - 1]) : null
}

/** The draw: pick how many are playing, then spin through the games that fit. */
export function DrawPanel({ games, onClose }: { games: GameDef[]; onClose: () => void }) {
  const { t, tp } = useI18n()
  const [players, setPlayers] = useState(startingCount)
  const pool = players === null ? games : games.filter((g) => fitsPlayers(g, players))

  return (
    <>
      <PlayerCountPicker value={players} onChange={setPlayers} />
      <div className="mt-4">
        {pool.length > 0 ? (
          // A new count is a new draw: remounting the reel spins it again.
          <DrawReel key={players ?? 'any'} games={pool} onClose={onClose} />
        ) : (
          <p className="surface-flat rounded-3xl px-4 py-8 text-center font-semibold text-ink/60 dark:text-white/60">
            {t('drawNoneFit', { players: tp('nPlayersFor', players ?? 0) })}
          </p>
        )}
      </div>
    </>
  )
}
