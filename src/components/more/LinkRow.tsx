import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

export function LinkRow({ icon, label, detail, onClick }: { icon: ReactNode; label: string; detail?: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left first:pt-1 last:pb-1">
      <span className="emoji-tile flex size-9 items-center justify-center rounded-xl text-accent">{icon}</span>
      <span className="flex-1 font-bold">{label}</span>
      {detail && <span className="flex items-center text-sm font-semibold text-ink/50 dark:text-white/50">{detail}</span>}
      <ChevronRight className="size-5 text-ink/30 dark:text-white/30" />
    </button>
  )
}
