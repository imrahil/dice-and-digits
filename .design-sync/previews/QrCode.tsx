import { QrCode } from 'dice-and-digits-ui'

/** Drawn on the device (never a QR web service); always dark on white for scanners. */
export function GameLink() {
  return (
    <div className="w-fit rounded-3xl bg-white p-2 ring-1 ring-edge">
      <QrCode text="https://imrahil.github.io/dice-and-digits/#/live/V4J97K" className="size-52" />
    </div>
  )
}

export function Small() {
  return <QrCode text="https://imrahil.github.io/dice-and-digits/#/live/V4J97K" className="size-24" />
}
