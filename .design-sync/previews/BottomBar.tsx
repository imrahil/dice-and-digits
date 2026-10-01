import { BottomBar, Button, Icons } from 'dice-and-digits-ui'

/** A screen's primary action, fixed above the home indicator with a fade behind it. */
export function SingleAction() {
  return (
    <div className="skin-bg relative h-[300px] w-[420px] overflow-hidden rounded-3xl [transform:translateZ(0)]">
      <div>
        <p className="p-4 text-sm text-ink/60">Screen content scrolls underneath.</p>
        <BottomBar>
          <Button variant="primary" size="lg" className="flex-1">
            <Icons.Check className="size-6" strokeWidth={3} /> Start game
          </Button>
        </BottomBar>
      </div>
    </div>
  )
}

/** A secondary icon action next to the main one (the rounds screen). */
export function TwoActions() {
  return (
    <div className="skin-bg relative h-[300px] w-[420px] overflow-hidden rounded-3xl [transform:translateZ(0)]">
      <div>
        <p className="p-4 text-sm text-ink/60">Screen content scrolls underneath.</p>
        <BottomBar>
          <Button size="lg" aria-label="Finish game" className="shrink-0 !px-4">
            <Icons.Flag className="size-5" />
          </Button>
          <Button variant="primary" size="lg" className="flex-1">
            <Icons.Plus className="size-6" strokeWidth={3} /> Add round
          </Button>
        </BottomBar>
      </div>
    </div>
  )
}
