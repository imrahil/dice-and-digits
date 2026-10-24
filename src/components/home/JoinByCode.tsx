import { useState } from 'react'
import { useI18n } from '../../i18n'
import { navigate } from '../../hooks/useRoute'
import { Button, Sheet, cx, inputClass } from '../ui'

/** For when the camera won't scan: type the code shown under the host's QR. */
export function JoinByCode({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const valid = /^[A-Z2-9]{6}$/.test(code)

  return (
    <Sheet open={open} onClose={onClose} title={t('joinGame')}>
      <p className="mb-3 text-sm text-ink/60 dark:text-white/60">{t('enterCode')}</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()

          if (!valid) {
            return
          }

          onClose()
          navigate(`live/${code}`)
        }}
      >
        <input
          className={cx(inputClass, 'text-center font-mono text-2xl tracking-[0.3em] uppercase')}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="ABC234"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          autoFocus
          aria-label={t('gameCode')}
        />
        <Button type="submit" variant="primary" className="!h-12 shrink-0" disabled={!valid}>
          {t('join')}
        </Button>
      </form>
    </Sheet>
  )
}
