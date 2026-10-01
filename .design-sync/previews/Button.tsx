import { Button, Icons } from 'dice-and-digits-ui'

/** The home screen's main call to action. */
export function Primary() {
  return (
    <div className="w-80">
      <Button variant="primary" size="lg" className="h-16 w-full !rounded-3xl !text-xl">
        <Icons.Plus className="size-7" strokeWidth={3} />
        New game
      </Button>
    </div>
  )
}

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">
        <Icons.Flag className="size-5" /> Finish game
      </Button>
      <Button variant="secondary">
        <Icons.ScanLine className="size-5" /> Join a game
      </Button>
      <Button variant="ghost">
        <Icons.Shuffle className="size-4" /> Shuffle
      </Button>
      <Button variant="danger">
        <Icons.Trash2 className="size-5" /> Delete
      </Button>
    </div>
  )
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" size="lg">
        <Icons.Check className="size-6" strokeWidth={3} /> Start game
      </Button>
      <Button variant="secondary" size="md">
        <Icons.Download className="size-5" /> Export
      </Button>
      <Button variant="ghost" size="sm">
        Change
      </Button>
    </div>
  )
}

/** Disabled until the form is valid, e.g. no players picked yet. */
export function Disabled() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" size="lg" disabled>
        Pick at least one player
      </Button>
      <Button variant="secondary" disabled>
        <Icons.RefreshCw className="size-5" /> Sync now
      </Button>
    </div>
  )
}

/** The same buttons under each skin: set data-skin on any ancestor (the app sets it on <html>). */
export function Skins() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {(['arcade', 'bubble', 'classic'] as const).map((skin) => (
        <div key={skin} data-skin={skin} className="skin-bg flex flex-col gap-3 rounded-2xl p-4">
          <span className="display text-sm font-extrabold">{skin}</span>
          <Button variant="primary">
            <Icons.Plus className="size-5" strokeWidth={3} /> New game
          </Button>
          <Button variant="secondary">Join</Button>
        </div>
      ))}
    </div>
  )
}
