import { Check } from 'lucide-react'
import { useI18n } from '../../i18n'
import { cx } from '../ui'
import type { Skin } from '../../types'

const SKINS = [
  { id: 'arcade', label: 'skinArcade', hint: 'skinArcadeHint' },
  { id: 'bubble', label: 'skinBubble', hint: 'skinBubbleHint' },
  { id: 'classic', label: 'skinClassic', hint: 'skinClassicHint' },
] as const satisfies readonly { id: Skin; label: string; hint: string }[]

/** Each tile renders a tiny scene in its own skin: data-skin rescopes every token below it. */
export function SkinPicker({ value, onChange }: { value: Skin; onChange: (skin: Skin) => void }) {
  const { t } = useI18n()

  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('skin')}>
      {SKINS.map((s) => {
        const on = s.id === value

        return (
          <button
            key={s.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s.id)}
            className={cx('relative rounded-2xl p-1 text-left transition active:scale-95', on ? 'ring-[3px] ring-accent' : 'ring-1 ring-ink/10 dark:ring-white/10')}
          >
            <div data-skin={s.id} className="skin-bg overflow-hidden rounded-xl p-2">
              <div className="surface rounded-xl p-2">
                <div className="flex items-center gap-1">
                  <span className="avatar-ring size-4 rounded-full bg-[#2e86de]" />
                  <span className="avatar-ring -ml-2 size-4 rounded-full bg-[#e05a9c]" />
                  <span className="display ml-auto text-lg leading-none font-black">42</span>
                </div>
                <div className="btn-cta mt-2 h-5 rounded-lg" />
              </div>
              <p className="display mt-2 truncate text-[13px] leading-tight font-extrabold">{t(s.label)}</p>
              <p className="truncate text-[11px] leading-tight opacity-60">{t(s.hint)}</p>
            </div>
            {on && (
              <span className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-accent text-white">
                <Check className="size-4" strokeWidth={3.5} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
