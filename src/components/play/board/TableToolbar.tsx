import type { ReactNode } from 'react'
import { Flag, List, Undo2 } from 'lucide-react'
import { useI18n } from '../../../i18n'
import { setCounterView } from '../../../lib/store'
import type { Session } from '../../../types'

const dockButton = 'flex size-11 shrink-0 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-30'

/** Table view has no page header: the target pill and a dock sit between the two halves instead. */
export function TableToolbar({
  session,
  elapsed,
  reachedName,
  badge,
  canUndo,
  onUndo,
  onFinish,
}: {
  session: Session
  elapsed: string
  /** Who reached the target, when someone has. */
  reachedName?: string
  badge?: ReactNode
  canUndo: boolean
  onUndo: () => void
  onFinish: () => void
}) {
  const { t, text } = useI18n()

  return (
    <>
      {reachedName !== undefined && (
        <button
          onClick={onFinish}
          className="flex max-w-full animate-pop items-center gap-1.5 self-center rounded-full bg-gold px-3 py-1 text-[13px] font-extrabold text-ink"
        >
          <Flag className="size-3.5 shrink-0" strokeWidth={2.5} />
          <span className="truncate">{t('targetReachedBanner', { name: reachedName, target: session.rules.target! })}</span>
        </button>
      )}
      <div className="nav-dock flex h-14 shrink-0 items-center gap-1 rounded-[20px] pr-1.5 pl-3.5 text-(--nav-ink)">
        <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold">
          {session.emoji} {text(session.rules.name)} · <span className="tabular-nums">{elapsed}</span>
        </span>
        {badge}
        <button aria-label={t('undo')} title={t('undo')} onClick={onUndo} disabled={!canUndo} className={dockButton}>
          <Undo2 className="size-5" />
        </button>
        <button aria-label={t('viewList')} title={t('viewList')} onClick={() => setCounterView(session.id, 'list')} className={dockButton}>
          <List className="size-5" />
        </button>
        <button onClick={onFinish} className="nav-on flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-3.5 text-sm font-extrabold transition active:scale-95">
          <Flag className="size-4" strokeWidth={2.5} /> {t('endShort')}
        </button>
      </div>
    </>
  )
}
