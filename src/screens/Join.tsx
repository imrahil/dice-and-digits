import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { useI18n } from '../i18n'
import { cloudEnabled, joinGroup, lookupInvite, useCloud } from '../lib/cloud'
import { navigate } from '../hooks/useRoute'
import { toast } from '../components/dialogs'
import { Button, Card, Empty, Page } from '../components/ui'

export function Join({ token }: { token: string }) {
  const { t } = useI18n()
  const { group } = useCloud()
  const [name, setName] = useState<string | null>(null)
  const [bad, setBad] = useState(false)
  const [busy, setBusy] = useState(false)
  const already = group && token.startsWith(group.id + '.')

  useEffect(() => {
    if (!cloudEnabled || already) {
      return
    }

    lookupInvite(token)
      .then((g) => setName(g.name))
      .catch(() => setBad(true))
  }, [token, already])

  const join = async () => {
    setBusy(true)

    try {
      await joinGroup(token)
      toast(t('joinedGroup', { name: name ?? '' }))
      navigate('more', { replace: true })
    } catch {
      setBad(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page title={t('joinGroup')} back="">
      {!cloudEnabled ? (
        <Empty icon="☁️">{t('cloudUnavailable')}</Empty>
      ) : already ? (
        <Empty icon="✅">{t('joinedGroup', { name: group.name })}</Empty>
      ) : bad ? (
        <Empty icon="🔗">{t('invalidInvite')}</Empty>
      ) : name === null ? (
        <div className="flex justify-center py-20">
          <Users className="size-10 animate-pulse text-accent" />
        </div>
      ) : (
        <Card className="mt-6 text-center">
          <div className="text-5xl">🎲</div>
          <p className="mt-3 text-lg font-extrabold">{t('joinPrompt', { name })}</p>
          {group && (
            <p role="alert" className="mt-3 surface-flat rounded-2xl p-3 text-sm font-semibold text-danger">
              {t('switchGroupWarning', { from: group.name, name })}
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button onClick={() => navigate('', { replace: true })}>{t('cancel')}</Button>
            <Button variant={group ? 'danger' : 'primary'} onClick={join} disabled={busy}>
              {group ? t('switchGroup') : t('joinGroup')}
            </Button>
          </div>
        </Card>
      )}
    </Page>
  )
}
