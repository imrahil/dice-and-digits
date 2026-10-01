import { IconButton, Icons } from 'dice-and-digits-ui'

/** Round, label-only-for-screen-readers buttons for header actions. */
export function HeaderActions() {
  return (
    <div className="flex items-center gap-1">
      <IconButton label="Back">
        <Icons.ChevronLeft className="size-6" />
      </IconButton>
      <IconButton label="Undo">
        <Icons.Undo2 className="size-5" />
      </IconButton>
      <IconButton label="Share results">
        <Icons.Share2 className="size-5" />
      </IconButton>
      <IconButton label="Menu">
        <Icons.MoreVertical className="size-5" />
      </IconButton>
    </div>
  )
}

export function Disabled() {
  return (
    <IconButton label="Undo" disabled className="disabled:opacity-30">
      <Icons.Undo2 className="size-5" />
    </IconButton>
  )
}

/** Destructive variant: recolour with an important text class (a plain text-* loses to the built-in ink colour). */
export function Danger() {
  return (
    <IconButton label="Delete round" className="!text-danger">
      <Icons.Trash2 className="size-5" />
    </IconButton>
  )
}
