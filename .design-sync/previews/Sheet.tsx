import { Button, Icons, Sheet } from 'dice-and-digits-ui'

/** Bottom sheet for menus and forms: slides up over a dimmed page; Escape or a tap outside closes it. */
export function GameMenu() {
  return (
    <div className="skin-bg relative h-[560px] w-[420px] overflow-hidden rounded-3xl [transform:translateZ(0)]">
      <Sheet open onClose={() => {}} title="Catan">
        <div className="flex flex-col gap-2">
          <Button className="w-full !justify-start">
            <Icons.Radio className="size-5" /> Share live
          </Button>
          <p className="px-1 pb-2 text-sm text-ink/55">Friends can follow the scores, or score their own seat, from their phones.</p>
          <Button className="w-full !justify-start">
            <Icons.Flag className="size-5" /> Finish game
          </Button>
          <Button variant="danger" className="w-full !justify-start">
            <Icons.Trash2 className="size-5" /> Abandon game
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

/** Without a title: just the grab handle and content. */
export function Untitled() {
  return (
    <div className="skin-bg relative h-[560px] w-[420px] overflow-hidden rounded-3xl [transform:translateZ(0)]">
      <Sheet open onClose={() => {}}>
        <p className="px-1 pt-2 pb-5 text-lg font-bold">Finish the game? Scores are saved to history.</p>
        <div className="grid grid-cols-2 gap-3">
          <Button>Cancel</Button>
          <Button variant="primary">Finish game</Button>
        </div>
      </Sheet>
    </div>
  )
}
