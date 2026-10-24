import type { ReactNode } from 'react'

export function ViewLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center justify-center gap-1.5">
      {icon}
      {label}
    </span>
  )
}
