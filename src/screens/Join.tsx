import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { useI18n } from '../i18n'
import { backupToken, cloudEnabled, joinGroup, lookupInvite, useCloud, type GroupKind } from '../lib/cloud'
import { isCode } from '../lib/recovery'
import { navigate } from '../hooks/useRoute'
import { toast } from '../components/dialogs'
import { Button, Card, Empty, Page } from '../components/ui'

/**
 * `link` is a group token (`<id>.<secret>`) from an invite, or a backup's
 * recovery code (12 hex, from the recovery QR or the typed words).
 */
export function Join({ link }: { link: string }) {
  const { t } = useI18n()
  const { group } = useCloud()
  const code = isCode(link) ? link : undefined
  const [token, setToken] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [kind, setKind] = useState<GroupKind>('group')
  const [bad, setBad] = useState(false)
  const [busy, setBusy] = useState(false)
  const already = group && (code ? group.code === code : link.startsWith(group.id + '.'))

  useEffect(() => {
    if (!cloudEnabled || already) {
      return
    }

    let live = true

    ;(async () => {
      try {
        const tk = code ? await backupToken(code) : link
        const g = await lookupInvite(tk)

        if (live) {
          setToken(tk)
          setName(g.name)
          setKind(g.kind)
        }
      } catch {
        if (live) {
          setBad(true)
        }
      }
    })()

    return () => {
      live = false
    }
  }, [link, code, already])

  const vault = kind === 'vault'

  const join = async () => {
    if (!token) {
      return
    }

    setBusy(true)

    try {
      await joinGroup(token, code)
      toast(vault ? t('restoreDone') : t('joinedGroup', { name: name ?? '' }))
      navigate('more', { replace: true })
    } catch {
      setBad(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page title={vault ? t('restoreTitle') : t('joinGroup')} back="">
      {!cloudEnabled ? (
        <Empty icon="☁️">{t('cloudUnavailable')}</Empty>
      ) : already ? (
        <Empty icon="✅">{t('joinedGroup', { name: group.name })}</Empty>
      ) : bad ? (
        <Empty icon="🔗">{code ? t('unknownBackup') : t('invalidInvite')}</Empty>
      ) : name === null ? (
        <div className="flex justify-center py-20">
          <Users className="size-10 animate-pulse text-accent" />
        </div>
      ) : (
        <Card className="mt-6 text-center">
          <div className="text-5xl">{vault ? '🔑' : '🎲'}</div>
          <p className="mt-3 text-lg font-extrabold">{vault ? t('restorePrompt', { name }) : t('joinPrompt', { name })}</p>
          {group && (
            <p role="alert" className="mt-3 surface-flat rounded-2xl p-3 text-sm font-semibold text-danger">
              {t('switchGroupWarning', { from: group.name, name })}
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button onClick={() => navigate('', { replace: true })}>{t('cancel')}</Button>
            <Button variant={group ? 'danger' : 'primary'} onClick={join} disabled={busy}>
              {group ? t('switchGroup') : vault ? t('restore') : t('joinGroup')}
            </Button>
          </div>
        </Card>
      )}
    </Page>
  )
}
