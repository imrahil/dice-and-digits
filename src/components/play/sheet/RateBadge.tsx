import type { Category } from '../../../types'

/** "×4" for counts worth 4 points each, "÷3" for 1 point per 3. */
export const rate = (c: Category) => (c.div ? `÷${c.div}` : `×${c.per}`)

export function RateBadge({ c }: { c: Category }) {
  return <span className="rounded-md bg-accent/12 px-1 text-[11px] font-black text-accent tabular-nums">{rate(c)}</span>
}
