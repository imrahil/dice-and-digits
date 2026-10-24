import { useI18n } from '../i18n'
import { DrawPanel } from './DrawPanel'
import { Sheet } from './ui'
import type { GameDef } from '../types'

/** "What do we play tonight?": spins through My shelf and lands on one. */
export function DrawSheet({ open, onClose, games }: { open: boolean; onClose: () => void; games: GameDef[] }) {
  const { t } = useI18n()

  return (
    <Sheet open={open} onClose={onClose} title={`🎲 ${t('drawTitle')}`}>
      <DrawPanel games={games} onClose={onClose} />
    </Sheet>
  )
}
