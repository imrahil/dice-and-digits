import { PotatoTimer } from 'dice-and-digits-ui'

/** Between rounds: the time is hidden, and the card says who got burnt last. */
export function Idle() {
  return (
    <div className="w-[420px]">
      <PotatoTimer phase="idle" elapsedMs={0} durationMs={0} hidden maxMs={30_000} lastBurnt="Maja" />
    </div>
  )
}

/** Hidden mode counts up against the 30 s maximum, so it never gives the end away. */
export function RunningHidden() {
  return (
    <div className="w-[420px]">
      <PotatoTimer phase="running" elapsedMs={17_000} durationMs={24_000} hidden maxMs={30_000} />
    </div>
  )
}

/** Visible mode counts this round's time down. */
export function RunningVisible() {
  return (
    <div className="w-[420px]">
      <PotatoTimer phase="running" elapsedMs={17_000} durationMs={24_000} hidden={false} maxMs={30_000} />
    </div>
  )
}

/** It went off: whoever holds the potato gets tapped below. */
export function Boom() {
  return (
    <div className="w-[420px]">
      <PotatoTimer phase="boom" elapsedMs={24_000} durationMs={24_000} hidden maxMs={30_000} />
    </div>
  )
}
