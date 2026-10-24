import { Minus, Trash2 } from 'lucide-react'
import { useI18n } from '../../i18n'
import { IconButton, cx, inputClass } from '../ui'
import type { Category } from '../../types'

/** One score-sheet category: its name, points per item (or ÷n, read-only), counts-as-minus and delete. */
export function CategoryRow({
  category: c,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  category: Category
  index: number
  canRemove: boolean
  onChange: (patch: Partial<Category>) => void
  onRemove: () => void
}) {
  const { t, text } = useI18n()

  return (
    <div className="flex items-center gap-2">
      <input
        className={cx(inputClass, '!h-11')}
        placeholder={`${t('categoryName')} ${index + 1}`}
        value={text(c.name)}
        maxLength={40}
        onChange={(e) => onChange({ name: e.target.value })}
      />
      {c.div ? (
        <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl text-sm font-black text-accent ring-1 ring-edge dark:ring-white/10">
          ÷{c.div}
        </span>
      ) : (
        <label className="flex h-11 w-16 shrink-0 items-center rounded-xl pl-2 ring-1 ring-edge focus-within:ring-2 focus-within:ring-accent dark:ring-white/10" title={t('perItem')}>
          <span className="text-sm font-black text-ink/40 dark:text-white/40">×</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            aria-label={t('perItem')}
            className="w-full bg-transparent px-1 text-center font-bold outline-none"
            value={c.per ?? ''}
            placeholder="1"
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)

              onChange({ per: Number.isFinite(n) && n > 1 ? n : undefined })
            }}
          />
        </label>
      )}
      <button
        onClick={() => onChange({ negative: !c.negative })}
        aria-pressed={!!c.negative}
        title={t('negativeCategory')}
        className={cx(
          'flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 transition',
          c.negative ? 'bg-danger text-white ring-danger' : 'text-ink/40 ring-edge dark:text-white/40 dark:ring-white/10',
        )}
      >
        <Minus className="size-5" strokeWidth={3} />
      </button>
      <IconButton label={t('delete')} onClick={onRemove} disabled={!canRemove}>
        <Trash2 className="size-5" />
      </IconButton>
    </div>
  )
}
