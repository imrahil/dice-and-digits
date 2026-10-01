import { useSyncExternalStore } from 'react'
import { useI18n } from '../i18n'
import { Button, Sheet } from './ui'

/**
 * Promise-based confirm() and toast(), rendered by <DialogHost/> once at the
 * app root, so screens can `if (await confirm(...))` without local state.
 */

type Confirm = { message: string; confirmLabel?: string; danger?: boolean; resolve: (ok: boolean) => void }
type Toast = { id: number; message: string }

let confirmState: Confirm | null = null
let toastState: Toast | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function confirm(message: string, opts: { confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  confirmState?.resolve(false)
  return new Promise((resolve) => {
    confirmState = { message, ...opts, resolve }
    emit()
  })
}

let toastTimer: ReturnType<typeof setTimeout> | undefined
export function toast(message: string) {
  toastState = { id: Date.now(), message }
  emit()
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastState = null
    emit()
  }, 2600)
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function DialogHost() {
  const { t } = useI18n()
  const c = useSyncExternalStore(subscribe, () => confirmState)
  const toastNow = useSyncExternalStore(subscribe, () => toastState)

  const close = (ok: boolean) => {
    c?.resolve(ok)
    confirmState = null
    emit()
  }

  return (
    <>
      <Sheet open={!!c} onClose={() => close(false)}>
        <p className="px-1 pt-2 pb-5 text-lg font-bold">{c?.message}</p>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => close(false)}>{t('cancel')}</Button>
          <Button variant={c?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
            {c?.confirmLabel ?? t('confirm')}
          </Button>
        </div>
      </Sheet>
      {toastNow && (
        <div
          key={toastNow.id}
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-[60] flex justify-center px-4"
        >
          <div className="animate-rise rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-ink">
            {toastNow.message}
          </div>
        </div>
      )}
    </>
  )
}
