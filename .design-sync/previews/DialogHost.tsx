import { useEffect } from 'react'
import { DialogHost, confirm, toast } from 'dice-and-digits-ui'

// Mount <DialogHost /> once at the app root; then any code can
// `if (await confirm('…')) …` or `toast('…')` without local state.

export function Confirm() {
  useEffect(() => {
    confirm('Finish the game? Scores are saved to history.', { confirmLabel: 'Finish game' })
  }, [])

  return (
    <div className="skin-bg relative h-[400px] w-[420px] overflow-hidden rounded-3xl [transform:translateZ(0)]">
      <DialogHost />
    </div>
  )
}

export function DangerConfirm() {
  useEffect(() => {
    confirm('Delete this game? It disappears from history and stats.', { confirmLabel: 'Delete', danger: true })
  }, [])

  return (
    <div className="skin-bg relative h-[400px] w-[420px] overflow-hidden rounded-3xl [transform:translateZ(0)]">
      <DialogHost />
    </div>
  )
}

export function Toast() {
  useEffect(() => {
    toast('Link copied')
  }, [])

  return (
    <div className="skin-bg relative h-[400px] w-[420px] overflow-hidden rounded-3xl [transform:translateZ(0)]">
      <DialogHost />
    </div>
  )
}
