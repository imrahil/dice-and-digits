import { Plus } from 'lucide-react'
import { Avatar } from '../ui'
import type { Player } from '../../types'

/** Saved players not seated yet: tap one to seat them. */
export function RosterChips({ players, onAdd }: { players: Player[]; onAdd: (playerId: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {players.map((p) => (
        <button key={p.id} onClick={() => onAdd(p.id)} className="surface press flex items-center gap-2 rounded-full py-1 pr-3.5 pl-1 font-bold">
          <Avatar name={p.name} color={p.color} size="sm" />
          {p.name}
          <Plus className="size-4 text-ink/40 dark:text-white/40" />
        </button>
      ))}
    </div>
  )
}
