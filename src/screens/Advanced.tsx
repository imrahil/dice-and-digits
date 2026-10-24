import { useRef, useState } from 'react'
import { Download, LogOut, QrCode, Upload } from 'lucide-react'
import { useI18n } from '../i18n'
import { cloudEnabled, createGroup, inviteLink, leaveGroup, useCloud } from '../lib/cloud'
import { exportBackup, importBackup } from '../lib/store'
import { confirm, toast } from '../components/dialogs'
import { QrShareSheet } from '../components/QrShare'
import { SyncStatus } from '../components/SyncStatus'
import { Button, Card, Page, Section, inputClass } from '../components/ui'

/** Things most people never need: shared groups and moving data by file. */
export function Advanced() {
  const { t } = useI18n()

  return (
    <Page title={t('advanced')} back="more">
      <p className="px-1 text-sm text-ink/65 dark:text-white/65">{t('advancedIntro')}</p>
      {cloudEnabled && <GroupSection />}
      <FileSection />
    </Page>
  )
}

function FileSection() {
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

/** A shared group: one history and set of stats for everyone in it. */
function GroupSection() {
  const { t } = useI18n()
  const { group } = useCloud()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [qr, setQr] = useState(false)

  const create = async () => {
    if (!name.trim()) {
      return
    }

    setBusy(true)

    try {
      await createGroup(name.trim())
    } catch (e) {
      toast(t('syncError', { error: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
    }
  }

  const leave = async () => {
    if (await confirm(t('leaveConfirm'), { confirmLabel: t('leaveGroup'), danger: true })) {
      leaveGroup()
    }
  }

  return (
    <Section title={t('cloud')}>
      <Card>
        {group?.kind === 'vault' ? (
          <p className="text-sm text-ink/65 dark:text-white/65">{t('groupWhileBackup')}</p>
        ) : group ? (
          <>
            <SyncStatus group={group} />
            <p className="mt-3 text-sm text-ink/65 dark:text-white/65">{t('cloudInGroupHint')}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button onClick={() => setQr(true)}>
                <QrCode className="size-5" /> {t('invite')}
              </Button>
              <Button variant="danger" onClick={leave}>
                <LogOut className="size-5" /> {t('leaveGroup')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 text-sm text-ink/65 dark:text-white/65">
              <p>{t('cloudIntro')}</p>
              <p>{t('cloudOptional')}</p>
              <details>
                <summary className="cursor-pointer py-2 font-bold text-accent">{t('cloudHowItWorks')}</summary>
                <div className="space-y-2">
                  <p>{t('cloudShared')}</p>
                  <p>{t('cloudHowJoin')}</p>
                  <p>{t('cloudSamePlayers')}</p>
                </div>
              </details>
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                create()
              }}
            >
              <input
                className={inputClass}
                placeholder={t('groupNamePlaceholder')}
                aria-label={t('groupName')}
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="submit" variant="primary" className="!h-12 shrink-0" disabled={!name.trim() || busy}>
                {t('createGroup')}
              </Button>
            </form>
          </>
        )}
      </Card>
      {group && group.kind !== 'vault' && (
        <QrShareSheet open={qr} onClose={() => setQr(false)} title={group.name} caption={t('scanToJoinGroup')} url={inviteLink(group)} />
      )}
    </Section>
  )
}
