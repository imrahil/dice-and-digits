import { Crown } from 'lucide-react'
import { useI18n } from '../../../i18n'

export function LeaderCrown() {
  const { t } = useI18n()

  return <Crown className="size-5 shrink-0 rotate-12 text-gold drop-shadow-[1px_1px_0_var(--line)]" fill="currentColor" aria-label={t('leader')} />
}
