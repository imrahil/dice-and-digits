import { Check, Copy, Share2 } from 'lucide-react'
import { useI18n } from '../../i18n'
import { inviteLink, markCodeSaved, type Group } from '../../lib/cloud'
import { codeWords } from '../../lib/recovery'
import { toast } from '../dialogs'
import { QrCode as QrImage } from '../QrCode'
import { shareUrl } from '../QrShareSheet'
import { Button, Sheet } from '../ui'

/** The recovery code and link as QR, to save somewhere safe. Generated on the phone, like every QR here. */
export function RecoveryKit({ group, open, onClose }: { group: Group; open: boolean; onClose: () => void }) {
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
