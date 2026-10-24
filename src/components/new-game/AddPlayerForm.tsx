import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useI18n } from '../../i18n'
import { Button, inputClass } from '../ui'

/** Type a name and press Enter (or +) to seat a new or existing player. */
export function AddPlayerForm({ onAdd }: { onAdd: (name: string) => void }) {
  const { t } = useI18n()
  const [name, setName] = useState('')

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()

        if (name.trim()) {
          onAdd(name.trim())
          setName('')
        }
      }}
    >
      <input
        className={inputClass}
        placeholder={t('newPlayerName')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={30}
        enterKeyHint="done"
      />
      <Button type="submit" variant="secondary" className="!h-12 shrink-0" aria-label={t('addPlayer')} disabled={!name.trim()}>
        <Plus className="size-5" />
      </Button>
    </form>
  )
}
