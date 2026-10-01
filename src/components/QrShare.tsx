import { useMemo, type ReactNode } from 'react'
import { Copy, Share2 } from 'lucide-react'
import { encode } from 'uqr'
import { useI18n } from '../i18n'
import { toast } from './dialogs'
import { Button, Sheet } from './ui'

/**
 * QR code drawn as one SVG path, generated on the phone: it works offline and
 * the link (which for a group invite *is* the key) never goes to a QR service.
 * Always dark-on-white, even in dark mode — scanners need the contrast.
 */
export function QrCode({ text, className }: { text: string; className?: string }) {
  const { path, size } = useMemo(() => {
    const qr = encode(text, { ecc: 'M', border: 2 })
    let d = ''

    qr.data.forEach((row, y) =>
      row.forEach((on, x) => {
        if (on) {
          d += `M${x} ${y}h1v1h-1z`
        }
      }),
    )

    return { path: d, size: qr.size }
  }, [text])

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} shapeRendering="crispEdges" role="img" aria-label={text}>
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#1f1a2e" />
    </svg>
  )
}

export async function shareUrl(url: string, title: string, copied: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url })

      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return
      }
    }
  }

  await copyUrl(url, copied)
}

async function copyUrl(url: string, copied: string) {
  try {
    await navigator.clipboard.writeText(url)
    toast(copied)
  } catch {
    // No clipboard (plain http, old browser): the link is on screen to copy by hand.
  }
}

/** "V4J97K" → "V4J 97K": easier to read out across the table. */
const spaced = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`

export function QrShareSheet({
  open,
  onClose,
  title,
  caption,
  url,
  code,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  caption: string
  url: string
  code?: string
  children?: ReactNode
}) {
  const { t } = useI18n()

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col items-center">
        <div className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-edge dark:ring-0">
          <QrCode text={url} className="size-52 max-h-[60vw] max-w-[60vw]" />
        </div>
        <p className="mt-2 text-center font-bold">{caption}</p>
        {code && (
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-xs font-extrabold tracking-wide text-ink/50 uppercase dark:text-white/50">{t('gameCode')}</span>
            <span className="font-mono text-3xl font-black tracking-[0.12em]">{spaced(code)}</span>
          </p>
        )}
        <p className="mt-1 w-full truncate text-center text-xs text-ink/45 select-all dark:text-white/45">{url}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button onClick={() => copyUrl(url, t('linkCopied'))}>
          <Copy className="size-5" /> {t('copyLink')}
        </Button>
        <Button variant="primary" onClick={() => shareUrl(url, typeof title === 'string' ? title : t('appName'), t('linkCopied'))}>
          <Share2 className="size-5" /> {t('shareLink')}
        </Button>
      </div>
      {children}
    </Sheet>
  )
}
