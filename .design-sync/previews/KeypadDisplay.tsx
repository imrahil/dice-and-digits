import { KeypadDisplay } from 'dice-and-digits-ui'

/** Scoreboard-style read-out above the keypad. */
export function Value() {
  return (
    <div className="w-80">
      <KeypadDisplay value="210" />
    </div>
  )
}

/** Placeholder until something is typed. */
export function Empty() {
  return (
    <div className="w-80">
      <KeypadDisplay value="" />
    </div>
  )
}

/** With a prefix naming what is being entered. */
export function WithPrefix() {
  return (
    <div className="w-80">
      <KeypadDisplay value="14" prefix="Coins ÷3" />
    </div>
  )
}
