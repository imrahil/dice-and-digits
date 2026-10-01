import { QrShareSheet } from 'dice-and-digits-ui'

/** Sharing a live game: QR, the six-letter code to read out, copy/share buttons. */
export function LiveGame() {
  return (
    <div className="skin-bg relative h-[720px] w-[420px] overflow-hidden rounded-3xl [transform:translateZ(0)]">
      <QrShareSheet
        open
        onClose={() => {}}
        title="🏝️ Catan"
        caption="Scan to follow the scores"
        url="https://imrahil.github.io/dice-and-digits/#/live/V4J97K"
        code="V4J97K"
      />
    </div>
  )
}

/** A group invite: no code, the link itself is the key. */
export function GroupInvite() {
  return (
    <div className="skin-bg relative h-[720px] w-[420px] overflow-hidden rounded-3xl [transform:translateZ(0)]">
      <QrShareSheet
        open
        onClose={() => {}}
        title="Friday Night Crew"
        caption="Scan to join the group"
        url="https://imrahil.github.io/dice-and-digits/#/join/g7Kq2vX9pLm4"
      />
    </div>
  )
}
