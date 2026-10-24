/** The big read-out above the pad. */
export function KeypadDisplay({ value, prefix, placeholder = '0' }: { value: string; prefix?: string; placeholder?: string }) {
  return (
    <div className="display mb-3 flex h-16 items-center justify-end rounded-2xl border-[length:var(--bw)] border-(--line) bg-ink px-4 text-4xl font-black text-candy-e tabular-nums shadow-[inset_0_2px_10px_rgb(0_0_0/0.5)] [text-shadow:0_0_14px_color-mix(in_oklab,var(--color-candy-e)_55%,transparent)] dark:bg-black/60">
      {prefix && <span className="mr-auto text-lg font-bold text-white/55 [text-shadow:none]">{prefix}</span>}
      {value ? value : <span className="text-white/25 [text-shadow:none]">{placeholder}</span>}
    </div>
  )
}
