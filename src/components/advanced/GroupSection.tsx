import { useState } from 'react'
import { LogOut, QrCode } from 'lucide-react'
import { useI18n } from '../../i18n'
import { createGroup, inviteLink, leaveGroup, useCloud } from '../../lib/cloud'
import { confirm, toast } from '../dialogs'
import { QrShareSheet } from '../QrShareSheet'
import { SyncStatus } from '../SyncStatus'
import { Button, Card, Section, inputClass } from '../ui'

/** A shared group: one history and set of stats for everyone in it. */
export function GroupSection() {
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
