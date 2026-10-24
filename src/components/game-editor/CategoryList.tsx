import { Minus, Plus } from 'lucide-react'
import { useI18n } from '../../i18n'
import { uid } from '../../lib/store'
import { Button } from '../ui'
import { CategoryRow } from './CategoryRow'
import type { Category } from '../../types'

/** A score sheet's categories: edit, delete (never the last one) and add. */
export function CategoryList({ categories, onChange }: { categories: Category[]; onChange: (categories: Category[]) => void }) {
  const { t } = useI18n()

  return (
    <>
      <div className="space-y-2">
        {categories.map((c, i) => (
          <CategoryRow
            key={c.id}
            category={c}
            index={i}
            canRemove={categories.length > 1}
            onChange={(p) => onChange(categories.map((x, k) => (k === i ? { ...x, ...p } : x)))}
            onRemove={() => onChange(categories.filter((_, k) => k !== i))}
          />
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-ink/55 dark:text-white/55">
        <span className="inline-flex size-4 items-center justify-center rounded bg-danger text-white">
          <Minus className="size-3" strokeWidth={3} />
        </span>
        {t('negativeCategory')}
      </p>
      <Button variant="ghost" className="mt-2 w-full" onClick={() => onChange([...categories, { id: uid().slice(0, 8), name: '' }])}>
        <Plus className="size-5" /> {t('addCategory')}
      </Button>
    </>
  )
}
