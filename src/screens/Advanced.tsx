import { useRef, useState } from 'react'
import { Check, Cloud, Copy, Download, KeyRound, LogOut, QrCode, Share2, Trash2, TriangleAlert, Upload } from 'lucide-react'
import { useI18n } from '../i18n'
import { cloudEnabled, createBackup, createGroup, deleteBackup, inviteLink, leaveGroup, markCodeSaved, useCloud, type Group } from '../lib/cloud'
import { codeWords } from '../lib/recovery'
import { exportBackup, importBackup } from '../lib/store'
import { navigate } from '../hooks/useRoute'
import { confirm, toast } from '../components/dialogs'
import { QrCode as QrImage, QrShareSheet, shareUrl } from '../components/QrShare'
import { SyncStatus } from '../components/SyncStatus'
import { Button, Card, Page, Section, Sheet, inputClass } from '../components/ui'

/** Things most people never need: shared groups and moving data by file. */
export function Advanced() {
  const { t } = useI18n()

  return (
    <Page title={t('advanced')} back="more">
      <p className="px-1 text-sm text-ink/65 dark:text-white/65">{t('advancedIntro')}</p>
      {cloudEnabled && <BackupSection />}
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

/**
 * Personal backup: a group of one opened by a recovery code. With a shared
 * group the group already holds a copy, so this only points at its link.
 */
function BackupSection() {
  const { t } = useI18n()
  const { group } = useCloud()
  const [busy, setBusy] = useState(false)
  const [kit, setKit] = useState(false)
  const [invite, setInvite] = useState(false)

  const create = async () => {
    setBusy(true)

    try {
      await createBackup(t('myBackup'))
      setKit(true)
    } catch (e) {
      toast(t('syncError', { error: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
    }
  }

  const turnOff = async () => {
    if (await confirm(t('turnOffConfirm'), { confirmLabel: t('turnOffBackup'), danger: true })) {
      leaveGroup()
    }
  }

  const remove = async () => {
    if (!(await confirm(t('deleteBackupConfirm'), { confirmLabel: t('deleteBackup'), danger: true }))) {
      return
    }

    try {
      await deleteBackup()
      toast(t('backupDeleted'))
    } catch (e) {
      toast(t('syncError', { error: e instanceof Error ? e.message : String(e) }))
    }
  }

  if (group && group.kind !== 'vault') {
    return (
      <Section title={t('backupCloud')}>
        <Card>
          <p className="text-sm text-ink/65 dark:text-white/65">{t('groupKeepsCopy')}</p>
          <Button className="mt-3 w-full" onClick={() => setInvite(true)}>
            <QrCode className="size-5" /> {t('saveInviteLink')}
          </Button>
        </Card>
        <QrShareSheet open={invite} onClose={() => setInvite(false)} title={group.name} caption={t('scanToJoinGroup')} url={inviteLink(group)} />
      </Section>
    )
  }

  return (
    <Section title={t('backupCloud')}>
      <Card>
        {group ? (
          <>
            <SyncStatus group={group} />
            {!group.savedAt && (
              <p role="alert" className="mt-3 flex items-start gap-2 surface-flat rounded-2xl p-3 text-sm font-semibold">
                <TriangleAlert className="size-5 shrink-0 text-gold" /> {t('saveCodeWarning')}
              </p>
            )}
            <Button variant={group.savedAt ? 'secondary' : 'primary'} className="mt-4 w-full" onClick={() => setKit(true)}>
              <KeyRound className="size-5" /> {t('recoveryCode')}
            </Button>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button onClick={turnOff}>
                <LogOut className="size-5" /> {t('turnOffBackup')}
              </Button>
              <Button variant="danger" onClick={remove}>
                <Trash2 className="size-5" /> {t('deleteBackup')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/65 dark:text-white/65">{t('backupIntro')}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button variant="primary" onClick={create} disabled={busy}>
                <Cloud className="size-5" /> {t('createBackup')}
              </Button>
              <Button onClick={() => navigate('restore')}>
                <KeyRound className="size-5" /> {t('restoreFromCode')}
              </Button>
            </div>
          </>
        )}
      </Card>
      {group && <RecoveryKit group={group} open={kit} onClose={() => setKit(false)} />}
    </Section>
  )
}

/** The recovery code and link as QR, to save somewhere safe. Generated on the phone, like every QR here. */
function RecoveryKit({ group, open, onClose }: { group: Group; open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n()
  const url = inviteLink(group)
  const words = group.code ? codeWords(group.code, lang) : []

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(words.join(' '))
      toast(t('codeCopied'))
    } catch {
      // No clipboard: the words are on screen and selectable.
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('recoveryCode')}>
      <p className="text-sm text-ink/65 dark:text-white/65">{t('recoveryHint')}</p>
      {words.length > 0 && (
        <ol data-testid="recovery-words" data-words={words.join(' ')} className="mt-3 grid grid-cols-2 gap-2">
          {words.map((w, i) => (
            <li key={i} className="flex items-baseline gap-2 surface-flat rounded-2xl px-3 py-2.5">
              <span className="display w-4 text-sm font-black text-ink/40 tabular-nums dark:text-white/40">{i + 1}</span>
              <span className="display text-xl font-black select-all">{w}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-3 flex justify-center">
        <div className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-edge dark:ring-0">
          <QrImage text={url} className="size-44 max-h-[50vw] max-w-[50vw]" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button onClick={copy} disabled={!words.length}>
          <Copy className="size-5" /> {t('copyCode')}
        </Button>
        <Button onClick={() => shareUrl(url, group.name, t('linkCopied'))}>
          <Share2 className="size-5" /> {t('shareLink')}
        </Button>
      </div>
      <Button
        variant="primary"
        className="mt-3 w-full"
        onClick={() => {
          markCodeSaved()
          onClose()
        }}
      >
        <Check className="size-5" strokeWidth={3} /> {t('codeSaved')}
      </Button>
    </Sheet>
  )
}
