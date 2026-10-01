import { useState } from 'react'
import { Card, Toggle } from 'dice-and-digits-ui'

export function On() {
  const [on, setOn] = useState(true)

  return (
    <div className="w-80">
      <Toggle checked={on} onChange={setOn} label="Keep screen on during a game" />
    </div>
  )
}

export function Off() {
  const [on, setOn] = useState(false)

  return (
    <div className="w-80">
      <Toggle checked={on} onChange={setOn} label="Vibrate on taps" />
    </div>
  )
}

/** With a hint line, inside a settings card. */
export function WithHint() {
  const [on, setOn] = useState(true)

  return (
    <Card className="w-80 !py-2">
      <Toggle checked={on} onChange={setOn} label="Lowest score wins" hint="Golf-style: fewest points takes the crown" />
    </Card>
  )
}
