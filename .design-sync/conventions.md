## Building with Dice & Digits

A mobile-first score keeper for board games. Design for a phone (≈390–430 px wide), thumbs, and a game table: big tap targets (≥ 44 px), primary actions at the bottom.

### Setup

- Wrap everything in `<I18nProvider lang="en">` (or `"pl"`). Every component reads its labels from it; without it they render English fallbacks only.
- **Skin**: set `data-skin` on `<html>` (or any wrapper) to `arcade` (default: ink outlines, hard shadows, lime CTA), `bubble` (Y2K gloss: gradient mesh, frosted cards, gradient CTA) or `classic` (cream and red). Everything below restyles itself per skin; never hard-code a skin's colours.
- **Dark mode**: add the class `dark` on `<html>`. Pair light/dark text as `text-ink/60 dark:text-white/60`.
- Mount `<DialogHost />` once at the root, then call `confirm('…', { confirmLabel, danger })` (returns a Promise<boolean>) or `toast('…')` from anywhere.
- Counter games have three views: `session.counterView` picks `list` (default), `grid` or `table`; `CounterGrid` / `CounterTable` render one directly.
- Hot Potato (`rules.timer`) adds a round timer: `PotatoTimer` shows it, `WinnerBoard` records the loser.
- Icons: `const { Icons } = window.DiceAndDigitsUi` → `<Icons.Plus className="size-5" />` (lucide; the set the app uses).

### Styling idiom: Tailwind utilities, precompiled

Styling is Tailwind v4 utility classes, but **only classes compiled into `styles.css` exist** — arbitrary values (`w-[372px]`) and unusual utilities will silently do nothing. Use inline `style` for one-off sizes, with tokens: `style={{ color: 'var(--color-accent)' }}`.

| Family | Use |
|---|---|
| `bg-* text-* border-*` + `paper card ink night slate edge accent gold mint danger white candy-a…candy-e`, opacity `/10 /15 /20 /30 /50 /60 /70` | colour (tokens follow the skin) |
| `surface` (raised panel), `surface-flat` (nested row, chip, input), `press` (tap feedback) | every card or tappable tile |
| `btn-cta` (primary fill), `chip-on` (selected pill), `emoji-tile`, `avatar-ring`, `skin-bg` (page backdrop) | skin building blocks |
| `display` (heading/score face), `section-title`, `font-semibold…font-black`, `text-xs…text-6xl`, `tabular-nums` | type — scores always `display … tabular-nums` |
| `flex grid gap-* p-* m-* w-* h-* size-* rounded-xl/2xl/3xl/full`, `-rotate-2 rotate-2` | layout; small tilts give the sticker feel |

Override a component's built-in colour with `!` (e.g. `className="!bg-gold/20"`, `!text-danger`) — a plain class can lose to the built-in one.

### Where the truth lives

`styles.css` → `_ds_bundle.css` holds the tokens (`--color-*`, `--font-display`, `--radius-*`) and each skin's variable block. Read `components/<group>/<Name>/<Name>.prompt.md` before using a component; scoring boards take a `session` (see `Session` in the `.d.ts`) and a `scorer` (`{ canEdit, apply }`).

### Example

```jsx
const { Page, Section, Card, Button, Avatar, Icons } = window.DiceAndDigitsUi

<I18nProvider lang="en">
  <Page title="Game night">
    <Section title="Who's playing?" className="!mt-2">
      <Card className="flex items-center gap-3 !p-3">
        <Avatar name="Ola" color="#e05a9c" />
        <span className="min-w-0 flex-1 truncate font-bold">Ola</span>
        <span className="display text-2xl font-black tabular-nums">42</span>
      </Card>
    </Section>
    <Button variant="primary" size="lg" className="mt-6 w-full">
      <Icons.Plus className="size-6" strokeWidth={3} /> New game
    </Button>
  </Page>
</I18nProvider>
```
