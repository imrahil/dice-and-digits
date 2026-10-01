import { Logo } from 'dice-and-digits-ui'

/** The app mark; the die takes the skin's accent colour. Size it with size-* classes. */
export function Sizes() {
  return (
    <div className="flex items-end gap-4">
      <Logo className="size-24" />
      <Logo className="size-16" />
      <Logo className="size-10" />
    </div>
  )
}

/** The home screen header. */
export function Lockup() {
  return (
    <div className="flex w-96 items-center gap-3">
      <Logo className="size-16 shrink-0 -rotate-6" />
      <div className="min-w-0">
        <h1 className="text-[34px] leading-[0.95] font-extrabold">Dice &amp; Digits</h1>
        <p className="chip-on mt-2 inline-block -rotate-2 rounded-full px-3 py-0.5 text-sm font-bold">Score keeper for board game night</p>
      </div>
    </div>
  )
}

/** One die per skin accent. */
export function Skins() {
  return (
    <div className="flex gap-3">
      {(['arcade', 'bubble', 'classic'] as const).map((skin) => (
        <div key={skin} data-skin={skin} className="skin-bg rounded-2xl p-3">
          <Logo className="size-16" />
        </div>
      ))}
    </div>
  )
}
