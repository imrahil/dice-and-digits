import { cx } from '../ui'

export function PlayerSelect({
  value,
  onChange,
  players,
  exclude,
}: {
  value: string
  onChange: (id: string) => void
  players: { id: string; name: string }[]
  exclude: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx('h-11 min-w-0 flex-1 rounded-xl bg-ink/5 px-3 font-bold outline-none dark:bg-white/8')}
    >
      {players
        .filter((p) => p.id !== exclude)
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
    </select>
  )
}
