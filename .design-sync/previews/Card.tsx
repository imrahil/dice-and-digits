import { Card, Icons, Toggle } from 'dice-and-digits-ui'

/** The basic raised panel. */
export function Default() {
  return (
    <Card className="w-80">
      <p className="display text-lg font-extrabold">Friday Night Crew</p>
      <p className="mt-1 text-sm text-ink/60">Share history and stats with your gaming group across phones.</p>
    </Card>
  )
}

/** With onClick it renders as a button and presses in. */
export function Tappable() {
  return (
    <Card className="flex w-80 items-center gap-3 !p-3" onClick={() => {}}>
      <span className="emoji-tile flex size-11 shrink-0 items-center justify-center rounded-2xl text-2xl">🏛️</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-extrabold">7 Wonders</span>
        <span className="block text-xs font-semibold text-ink/55">Score sheet · 7 categories</span>
      </span>
      <Icons.ChevronRight className="size-5 text-ink/30" />
    </Card>
  )
}

/** A settings group: rows divided inside one card. */
export function SettingsGroup() {
  return (
    <Card className="w-80 !py-2">
      <Toggle checked label="Keep screen on during a game" onChange={() => {}} />
      <div className="border-t border-edge">
        <Toggle checked={false} label="Lowest score wins" hint="For golf-style games" onChange={() => {}} />
      </div>
    </Card>
  )
}

/** Highlight tints go on with ! so they beat the surface fill. */
export function Highlighted() {
  return (
    <Card className="w-80 !bg-gold/20">
      <p className="font-extrabold">It’s a tie!</p>
      <p className="text-sm text-ink/65">Pick who won the tie-break, or leave it shared.</p>
    </Card>
  )
}
