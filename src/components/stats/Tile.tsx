import { Card } from '../ui'

export function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="!p-3">
      <span className="block display text-2xl font-black tabular-nums">{value}</span>
      <span className="block text-xs font-bold text-ink/55 dark:text-white/55">{label}</span>
    </Card>
  )
}
