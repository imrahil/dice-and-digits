import { useMemo } from 'react'
import { encode } from 'uqr'

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
