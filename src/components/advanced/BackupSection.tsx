import { useState } from 'react'
import { Cloud, KeyRound, LogOut, QrCode, Trash2, TriangleAlert } from 'lucide-react'
import { useI18n } from '../../i18n'
import { createBackup, deleteBackup, inviteLink, leaveGroup, useCloud } from '../../lib/cloud'
import { navigate } from '../../hooks/useRoute'
import { confirm, toast } from '../dialogs'
import { QrShareSheet } from '../QrShareSheet'
import { SyncStatus } from '../SyncStatus'
import { Button, Card, Section } from '../ui'
import { RecoveryKit } from './RecoveryKit'

/**
 * Personal backup: a group of one opened by a recovery code. With a shared
 * group the group already holds a copy, so this only points at its link.
 */
export function BackupSection() {
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
