import { allGames } from '../lib/games'
import { useStore } from '../lib/store'
import { GamePicker } from '../components/new-game/GamePicker'
import { Setup } from '../components/new-game/Setup'

export function NewGame({ gameId }: { gameId?: string }) {
  const custom = useStore((s) => s.games)
  const game = gameId ? allGames(custom).find((g) => g.id === gameId) : undefined

  return game ? <Setup key={game.id} game={game} /> : <GamePicker />
}
