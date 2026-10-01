import { Icons, Section, SessionRow } from 'dice-and-digits-ui'
import { catanFinished, kittens } from './fixtures'

/** A titled block of a screen; the title takes the skin's section style (a highlighter swipe in Arcade). */
export function Default() {
  return (
    <div className="w-96">
      <Section title="Recent results" className="!mt-0">
        <div className="flex flex-col gap-2">
          <SessionRow session={catanFinished} onClick={() => {}} />
          <SessionRow session={kittens} onClick={() => {}} />
        </div>
      </Section>
    </div>
  )
}

/** With a trailing action link. */
export function WithAction() {
  return (
    <div className="w-96">
      <Section
        title="Recent results"
        className="!mt-0"
        action={
          <button className="flex items-center text-sm font-bold text-accent">
            See all <Icons.ChevronRight className="size-4" />
          </button>
        }
      >
        <SessionRow session={catanFinished} onClick={() => {}} />
      </Section>
    </div>
  )
}

/** The same heading in each skin. */
export function Skins() {
  return (
    <div className="grid w-[560px] grid-cols-3 gap-3">
      {(['arcade', 'bubble', 'classic'] as const).map((skin) => (
        <div key={skin} data-skin={skin} className="skin-bg rounded-2xl px-3 pb-3">
          <Section title="Quick start">
            <p className="text-sm">{skin}</p>
          </Section>
        </div>
      ))}
    </div>
  )
}
