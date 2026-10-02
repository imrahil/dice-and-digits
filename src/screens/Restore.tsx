import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useI18n } from '../i18n'
import { cloudEnabled } from '../lib/cloud'
import { parseWords } from '../lib/recovery'
import { navigate } from '../hooks/useRoute'
import { Button, Card, Empty, Page, inputClass } from '../components/ui'

/** Type the six recovery words (or paste the recovery link); the join screen then confirms and restores. */
export function Restore() {
  const { t } = useI18n()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const link = /#\/join\/(\S+)/.exec(input)

    if (link) {
      navigate(`join/${link[1]}`, { replace: true })

      return
    }

    const parsed = parseWords(input)

    if ('code' in parsed) {
      navigate(`join/${parsed.code}`, { replace: true })
    } else if (parsed.error === 'unknown') {
      setError(t('unknownWord', { word: parsed.word }))
    } else {
      setError(t('codeWordCount', { n: parsed.count }))
    }
  }

  return (
    <Page title={t('restoreTitle')} back="more">
      {!cloudEnabled ? (
        <Empty icon="☁️">{t('cloudUnavailable')}</Empty>
      ) : (
        <Card className="mt-2">
          <p className="text-sm text-ink/65 dark:text-white/65">{t('restoreHint')}</p>
          <form
            className="mt-3"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <input
              className={inputClass + ' font-bold'}
              aria-label={t('restoreCodeLabel')}
              placeholder={t('restorePlaceholder')}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setError(null)
              }}
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
            />
            {error && (
              <p role="alert" className="mt-2 text-sm font-semibold text-danger">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" className="mt-3 w-full" disabled={!input.trim()}>
              <KeyRound className="size-5" /> {t('restore')}
            </Button>
          </form>
        </Card>
      )}
    </Page>
  )
}
