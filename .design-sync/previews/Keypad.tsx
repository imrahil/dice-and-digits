import { useState } from 'react'
import { Keypad, KeypadDisplay } from 'dice-and-digits-ui'

/** The app's own number pad (iOS's has no minus key), with its read-out. */
export function WithDisplay() {
  const [v, setV] = useState('-60')

  return (
    <div className="w-80">
      <KeypadDisplay value={v} />
      <Keypad value={v} onChange={setV} />
    </div>
  )
}

/** allowNegative={false} drops the ± key, for amounts added or subtracted separately. */
export function PositiveOnly() {
  const [v, setV] = useState('12')

  return (
    <div className="w-80">
      <Keypad value={v} onChange={setV} allowNegative={false} />
    </div>
  )
}
