import { useRef } from 'react'
import { Download, Upload } from 'lucide-react'
import { useI18n } from '../../i18n'
import { exportBackup, importBackup } from '../../lib/store'
import { toast } from '../dialogs'
import { Button, Section } from '../ui'

/** Moving everything by hand: a JSON file out, or one merged in. */
export function FileSection() {
  const { t } = useI18n()
  const fileRef = useRef<HTMLInputElement>(null)

  const doExport = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' })
    const a = document.createElement('a')

    a.href = URL.createObjectURL(blob)
    a.download = `dice-and-digits-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const doImport = async (file: File) => {
    const n = importBackup(await file.text())

    toast(n === null ? t('importFailed') : t('importDone', { n }))
  }

  return (
    <Section title={t('backup')}>
      <p className="mb-3 px-1 text-sm text-ink/65 dark:text-white/65">{t('backupFileHint')}</p>
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={doExport}>
          <Download className="size-5" /> {t('exportData')}
        </Button>
        <Button onClick={() => fileRef.current?.click()}>
          <Upload className="size-5" /> {t('importData')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]

            if (f) {
              doImport(f)
            }

            e.target.value = ''
          }}
        />
      </div>
    </Section>
  )
}
