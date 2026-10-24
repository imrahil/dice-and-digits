import { useI18n } from '../i18n'
import { DrawReel } from './DrawReel'
import { Sheet } from './ui'
import type { GameDef } from '../types'

/** "What do we play tonight?": spins through My shelf and lands on one. */
export function DrawSheet({ open, onClose, games }: { open: boolean; onClose: () => void; games: GameDef[] }) {
  const { t } = useI18n()

  return (
    <Sheet open={open} onClose={onClose} title={`🎲 ${t('drawTitle')}`}>
      <DrawReel games={games} onClose={onClose} />
    </Sheet>
  )
}
