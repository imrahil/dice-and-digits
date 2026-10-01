import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { goBack } from '../hooks/useRoute'
import { useI18n } from '../i18n'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Page({
  title,
  back,
  actions,
  children,
  bare,
}: {
  title?: ReactNode
  /** Fallback route when there is no in-app history; omit for top-level tabs. */
  back?: string
  actions?: ReactNode
  children: ReactNode
  /** No bottom nav underneath (full-screen screens like Play). */
  bare?: boolean
}) {
  const { t } = useI18n()
  return (
    <div className={cx('mx-auto w-full max-w-2xl', bare ? 'pb-[calc(env(safe-area-inset-bottom)+1rem)]' : 'pb-28')}>
      {(title || back !== undefined || actions) && (
        <header className="sticky top-0 z-30 flex items-center gap-1 bg-paper/85 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 backdrop-blur-md dark:bg-night/85">
          {back !== undefined && (
            <IconButton label={t('back')} onClick={() => goBack(back)} className="-ml-1">
              <ChevronLeft className="size-6" />
            </IconButton>
          )}
          <h1 className={cx('min-w-0 flex-1 truncate text-xl font-extrabold tracking-tight', back === undefined && 'pl-1')}>
            {title}
          </h1>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </header>
      )}
      <main className="px-4">{children}</main>
    </div>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'lg' | 'sm'
}

export function Button({ variant = 'secondary', size = 'md', className, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        size === 'lg' && 'h-14 px-6 text-lg',
        size === 'md' && 'h-11 px-4 text-[15px]',
        size === 'sm' && 'h-9 rounded-xl px-3 text-sm',
        variant === 'primary' && 'bg-accent text-white shadow-[0_4px_0_0_var(--color-accent-dark)] active:translate-y-0.5 active:shadow-[0_2px_0_0_var(--color-accent-dark)]',
        variant === 'secondary' && 'bg-card text-ink ring-1 ring-edge dark:bg-slate dark:text-white dark:ring-white/10',
        variant === 'ghost' && 'text-ink/70 hover:bg-ink/5 dark:text-white/70 dark:hover:bg-white/5',
        variant === 'danger' && 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-[#ff8a93]',
        className,
      )}
    />
  )
}

export function IconButton({
  label,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'inline-flex size-10 items-center justify-center rounded-full text-ink/80 transition hover:bg-ink/5 active:scale-90 dark:text-white/80 dark:hover:bg-white/10',
        className,
      )}
    />
  )
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cx(
        'block w-full rounded-3xl bg-card p-4 text-left ring-1 ring-edge dark:bg-slate dark:ring-white/8',
        onClick && 'transition active:scale-[0.99]',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

export function Section({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mt-6', className)}>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-extrabold uppercase tracking-wide text-ink/50 dark:text-white/50">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Avatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <span
      aria-hidden
      style={{ backgroundColor: color }}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]',
        size === 'sm' && 'size-7 text-[11px]',
        size === 'md' && 'size-10 text-sm',
        size === 'lg' && 'size-14 text-lg',
      )}
    >
      {initials || '?'}
    </span>
  )
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
}) {
  const { t } = useI18n()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/50 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg animate-rise overflow-y-auto rounded-t-[28px] bg-paper px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl sm:rounded-[28px] dark:bg-slate"
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/15 sm:hidden dark:bg-white/20" />
        {title && (
          <div className="mb-3 flex items-center gap-2">
            <h2 className="min-w-0 flex-1 truncate text-lg font-extrabold">{title}</h2>
            <IconButton label={t('close')} onClick={onClose} className="-mr-2">
              <X className="size-5" />
            </IconButton>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-ink/55 dark:text-white/55">{hint}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-ink/15 transition peer-checked:bg-mint peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5 dark:bg-white/15" />
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cx('flex rounded-2xl bg-ink/6 p-1 dark:bg-white/8', className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-xl px-2 py-2 text-sm leading-tight font-bold transition',
            o.value === value ? 'bg-card text-ink shadow-sm dark:bg-white/15 dark:text-white' : 'text-ink/60 dark:text-white/60',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 text-5xl">{icon}</div>
      {title && <p className="text-lg font-extrabold">{title}</p>}
      {children && <div className="mt-1 max-w-xs text-ink/60 dark:text-white/60">{children}</div>}
    </div>
  )
}

export const inputClass =
  'h-12 w-full rounded-2xl bg-card px-4 text-base font-semibold ring-1 ring-edge outline-none placeholder:font-normal placeholder:text-ink/35 focus:ring-2 focus:ring-accent dark:bg-night dark:ring-white/10 dark:placeholder:text-white/35'

/** Primary actions pinned to the bottom of the screen, above the home indicator. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="h-24" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-paper via-paper/95 to-transparent pt-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] dark:from-night dark:via-night/95">
        <div className="mx-auto flex max-w-2xl gap-3 px-4">{children}</div>
      </div>
    </>
  )
}
