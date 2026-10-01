import { Card, IconButton, Icons, Page, Section, SessionRow } from 'dice-and-digits-ui'
import { catanFinished, kittens } from './fixtures'

/** A top-level tab screen: sticky blurred header, 16px side padding. */
export function TabScreen() {
  return (
    <div className="w-[420px]">
      <Page title="History">
        <Section title="Today" className="!mt-2">
          <div className="flex flex-col gap-2">
            <SessionRow session={catanFinished} onClick={() => {}} />
            <SessionRow session={kittens} onClick={() => {}} />
          </div>
        </Section>
      </Page>
    </div>
  )
}

/** A pushed screen: `back` adds the chevron (its value is the fallback route), `actions` sit on the right. */
export function DetailScreen() {
  return (
    <div className="w-[420px]">
      <Page
        back="history"
        title={
          <span className="flex items-center gap-2">
            <span>🏝️</span>
            <span className="truncate">Catan</span>
          </span>
        }
        actions={
          <IconButton label="Share results">
            <Icons.Share2 className="size-5" />
          </IconButton>
        }
        bare
      >
        <Card>
          <p className="font-extrabold">Notes</p>
          <p className="text-sm text-ink/60">Played with the Seafarers expansion.</p>
        </Card>
      </Page>
    </div>
  )
}
