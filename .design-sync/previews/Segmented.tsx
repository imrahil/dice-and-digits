import { useState } from 'react'
import { Segmented } from 'dice-and-digits-ui'

/** Theme picker from Settings: the selected option takes the CTA fill. */
export function Theme() {
  const [v, setV] = useState<'auto' | 'light' | 'dark'>('light')

  return (
    <div className="w-80">
      <Segmented
        value={v}
        onChange={setV}
        options={[
          { value: 'auto', label: 'Auto' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />
    </div>
  )
}

export function Language() {
  const [v, setV] = useState<'pl' | 'en'>('en')

  return (
    <div className="w-80">
      <Segmented
        value={v}
        onChange={setV}
        options={[
          { value: 'pl', label: '🇵🇱 Polski' },
          { value: 'en', label: '🇬🇧 English' },
        ]}
      />
    </div>
  )
}

/** `grid` lays longer labels out in two columns. */
export function Grid() {
  const [v, setV] = useState('rounds')

  return (
    <div className="w-80">
      <Segmented
        grid
        value={v}
        onChange={setV}
        options={[
          { value: 'counter', label: 'Tap counter' },
          { value: 'rounds', label: 'Rounds' },
          { value: 'sheet', label: 'Score sheet' },
          { value: 'winner', label: 'Winner only' },
        ]}
      />
    </div>
  )
}
