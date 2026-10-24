import { Flag } from 'lucide-react'
import { useI18n } from '../../../i18n'

/** "Anna reached 10!" above the board, tapping it finishes the game. */
export function TargetBanner({ name, target, onFinish }: { name: string; target: number; onFinish: () => void }) {
  const { t } = useI18n()

  return (
    <button
      onClick={onFinish}
      className="mb-3 flex w-full animate-pop items-center gap-3 rounded-2xl bg-gold/20 px-4 py-3 text-left font-bold"
    >
      <Flag className="size-5 shrink-0 text-gold" />
      <span className="flex-1">{t('targetReachedBanner', { name, target })}</span>
      <span className="text-accent">{t('finishGame')} →</span>
    </button>
  )
}
