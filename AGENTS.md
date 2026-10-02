# AGENTS.md

Guidance for coding agents working in this repository. Human-facing docs live
in [`README.md`](README.md) and [`worker/README.md`](worker/README.md).

## Setup commands

```sh
npm install
npm run dev      # Vite dev server
npm test         # Vitest: logic, store, and group sync against the real worker
npm run build    # tsc -b (type-check) + production build to dist/
npm run lint     # ESLint for src/ and worker/ (lint:fix auto-fixes almost everything)
npm run e2e      # Playwright: real app + `wrangler dev`, several phones (~1 min)
npm run coverage # unit-test coverage report (text + coverage/index.html)
```

`npm run lint`, `npm test` and `npm run build` are the checks; run all three
before declaring work done (`npm run lint:fix` first). Run `npm run e2e` too
when touching screens, sync or live games. CI (`.github/workflows/ci.yml`)
runs all of them, plus the worker tests, on every pull request and before
every deploy.

### Tests

- **Unit (Vitest, `src/**/*.test.ts`)**: pure logic in the default node
  environment. Files that need `localStorage`/`window` start with
  `// @vitest-environment happy-dom`. The store reads storage at import, so
  tests import it fresh after `vi.resetModules()`.
- **Sync (`src/lib/cloud.test.ts`)**: several "phones" (a swapped-in
  localStorage each) sync through the real `worker/src/worker.js` in-process,
  on node:sqlite via `worker/test/d1.mjs`. No mocked server.
- **E2E (`e2e/*.spec.ts`)**: `playwright.config.ts` starts `wrangler dev`
  (fresh local D1/DO state in `worker/.wrangler/e2e`) and a production build
  with `VITE_API_URL` pointing at it. Each phone is its own browser context
  (`newPhone()` in `e2e/helpers.ts`). The UI is Polish by default there.
  Locally, Playwright's browsers live in `/opt/pw-browsers` in the Claude
  cloud environment (`PLAYWRIGHT_BROWSERS_PATH`).

Worker commands run from `worker/`:

```sh
npm test             # node:test on node:sqlite — no npm dependencies
npx wrangler dev     # local worker (apply migrations with --local first)
npx wrangler deploy  # CI does NOT deploy the worker
```

## Architecture

Local-first React SPA on GitHub Pages plus an optional Cloudflare Worker with
D1 (shared groups) and one Durable Object per live game (`Room`).

- **`src/lib/store.ts`** is the single source of truth. It holds localStorage
  collections (`players`, `games` = custom only, `sessions`) behind
  `useSyncExternalStore`. Every write goes through `put()`, which stamps
  `updatedAt` and marks the doc **dirty** for sync.
- **`src/lib/scoring.ts`** computes totals, standings and the tie-break for all
  four modes (`counter` = tap log, `rounds` = array of per-round maps, `sheet`
  = category × player, `winner` = rounds holding a 1 for whoever won, or lost
  when `lowWins`). Screens never sum scores themselves.
- **Sheet cells store what was entered, not points.** A category with
  `per`/`div` stores the count (3 tiles, 14 coins); `cellPoints()` turns it
  into points. Don't pre-multiply when saving.
- **`src/lib/ops.ts`**: every score change is an *op* (`add` / `cell` /
  `round`) applied by `applyOp()`. Boards take a `Scorer` (`src/lib/scorer.ts`:
  `canEdit(seat)` + `apply(ops)`), so the same UI serves the host (all seats,
  local store) and a joined phone (own seat, ops sent to the room).
- **`src/lib/cloud.ts`** handles groups, sync and live-game HTTP calls.
  Everything is a no-op when `VITE_API_URL` is empty (`cloudEnabled`).
- **`src/lib/room.ts`** (reconnecting WebSocket), **`src/hooks/useLiveHost.ts`**
  (host side, on the Play screen) and **`src/hooks/useRoom.ts`** (watching or
  joined phone, on the Live screen).
- **`worker/src/worker.js`** is the router plus groups and sync on D1 (see
  `worker/migrations/`). **`worker/src/room.js`** is the Room Durable Object;
  its WebSocket protocol is documented at the top of the file.
- Routing is hash-based (`src/hooks/useRoute.ts`, `App.tsx`'s `Router`).

## Conventions and constraints

- **A session snapshots its rules** (`session.rules`, `session.seats`) at
  start. Editing or deleting a game definition or player must never change
  past results. Stats prefer the current roster name and colour, and fall back
  to the snapshot.
- **Built-in game ids (`builtin:*`) are permanent**: sessions and stats refer to
  them. Rename labels freely; never rename an id.
- **Only finished sessions sync.** In-progress games are private to the phone
  (`shareable()` in store.ts). Deleting a synced doc leaves a tombstone
  (`deleted: true`), never a hard delete.
- **Last-write-wins on `updatedAt`**, both in `applyRemote()` and in the
  worker's upsert `WHERE`. Keep the two in agreement.
- **Sync paging must not split a rev.** See the comment in `sync()` and the
  paging test. `MAX_PUSH` in cloud.ts must stay ≤ `LIMITS.docsPerPush`.
- **The app works without the backend.** Gate every cloud UI on `cloudEnabled`.
- **`VITE_API_URL` is baked in at build time.** `.env` is committed on purpose:
  the URL is public and the Pages build passes no env of its own.
- **QR codes are generated on the phone** (`uqr`, `components/QrShare.tsx`).
  Never send a link to a QR web service: a group invite link *is* the key.
- **No passwords or accounts.** A group is a capability: whoever has the invite
  link is in. Only secret hashes are stored server-side.

## Live games (join to score)

- **The host phone is authoritative.** The room never interprets ops beyond a
  shape check (`validOp`). It queues them and relays them to the host, which
  applies them with `applyRemote()` and pushes the new session. Don't move
  scoring rules into the worker.
- **Ops are idempotent by id.** The host remembers applied ids in
  `session.ops`, and the room drops ids already queued or applied. Guests keep
  unapplied ops in localStorage (`dice-digits:guest:<code>`) and resend them
  after a reconnect.
- **A joined phone may only edit its own seat.** This is enforced in the room
  (op `p` must equal the claimed seat) and in the UI (`scorer.canEdit`).
  Host-only actions (undo, deleting a round, freeing a seat) stay outside ops.
- **A rounds op's `index` means "round N" for everyone**, so a player's entry
  and the host's entry for the same round merge into one row. `RoundEntry`
  sends only rows that were typed in or are still empty, so it never
  overwrites a value that arrived from a player while it was open.
- **The Room uses the Hibernation API and keeps no state in memory**; storage
  is the truth. The router calls it via internal `fetch` (`/rpc/<name>`), not
  Workers RPC, so `room.js` needs no `cloudflare:workers` import and is tested
  in `node:test` with `worker/test/do.mjs`.

## i18n

- `src/i18n/en.ts` defines the keys and types; `pl.ts` is typed `Dict`, so a
  missing Polish key fails `tsc`. The tests also check that placeholders
  match.
- Plurals use `Intl.PluralRules`: Polish needs `one`/`few`/`many`
  (1 gra, 2 gry, 5 gier). Use `tp()`, never `n === 1 ? … : …`.
- Built-in presets carry `{ en, pl }` labels (`Text` type); user text is a
  plain string. Render with `text()`.
- Dates use the `en-GB` / `pl-PL` locales (day-first, 24 h). Don't CSS-
  `capitalize` Polish dates; use `capitalize()` from Result.tsx.

## Mobile UX rules

- Score entry uses the app's own `Keypad`, not `<input type=number>`: the iOS
  numeric keyboard has no minus key.
- Primary actions sit in `BottomBar` (fixed, safe-area aware). Tap targets are
  ≥ 44 px. Buttons have `touch-action: manipulation`.
- `useWakeLock` keeps the screen on during a game (setting: `keepAwake`).

## PWA

`vite-plugin-pwa` precaches the bundle, because offline matters at a game
table. It uses `registerType: 'prompt'`: `App.tsx` shows an "update ready"
banner instead of reloading mid-game. Don't switch it to `autoUpdate`.

## Styling

- Tailwind v4, configured in CSS (`src/index.css` `@theme`). There is no
  `tailwind.config`. Use the tokens (`bg-paper`, `text-ink`, `bg-accent`,
  `text-gold`, `bg-slate`, `bg-night`) rather than raw hex. Gradients are
  `bg-linear-to-*` (v4), not `bg-gradient-to-*`.
- **Skins** (`settings.skin`: `arcade` default, `bubble`, `classic`). Each is
  a block of CSS variables in `src/index.css` under `[data-skin=…]` and
  `.dark[data-skin=…]`: Tailwind's theme tokens (colours, radii, fonts) plus
  shape variables (`--bw`/`--line` outline, `--sh` shadow, `--press`,
  `--cta*`, `--page-bg`, `--nav-*`). Every skin defines every variable,
  because the Settings previews nest `data-skin` inside another skin.
  Adding a skin: a CSS block (light + dark), the `Skin` type, `SKINS` in
  `More.tsx`, `COLORS` in `useTheme.ts`, and i18n labels.
- Build surfaces with the skin utilities, not hand-rolled rings: `surface`
  (raised panel), `surface-flat` (nested row, chip, input), `press` (tap
  feedback), `btn-cta` (primary action), `chip-on` (selected pill),
  `emoji-tile`, `avatar-ring`, `display` (heading/score font),
  `section-title`. Score numbers use `display`.
- Dark mode is class-based. Both `src/hooks/useTheme.ts` and the inline script
  in `index.html` toggle `.dark` and set `data-skin`, and the script reads the
  `dice-digits:settings` key. Change one, change the other.
- `vite.config.ts` uses `base: './'`. Reference public assets relatively.
- `public/icons/icon.svg` is the master icon. Its drawing also lives in
  `src/components/Logo.tsx`. The PNGs are rendered from the SVG.

## Code style

Enforced by `eslint.config.js` (one config for the app and the worker):

- **Every `if`/`else`/`for`/`while` has braces**, with the body on its own line,
  never `if (x) return`.
- **Blank lines between steps**: before every `return` (unless it is the
  first line of its block), after a group of `const`/`let`, and around
  multi-line `if`/`for`/`switch`/`try` blocks.
- 2-space indent, single quotes, no semicolons, trailing commas on multi-line
  literals, `(x) =>` parentheses, `===` (except `x == null`).
- React hooks rules (`rules-of-hooks`, `exhaustive-deps`) are errors.

Not linted but expected: named exports only, hooks in `src/hooks/`, shared
types in `src/types.ts`, screens in `src/screens/`. No Prettier: ESLint's
stylistic rules are the formatter.

## Versioning

- **Bump `version` in `package.json` before every PR merge.** It is shown in
  More → About (injected by `vite.config.ts` as `__APP_VERSION__`). Use semver:
  patch for fixes, minor for features. Also update `package-lock.json`
  (`npm version <x.y.z> --no-git-tag-version`).

## Deployment

Push to `main` → tests + build → GitHub Pages. Run the worker deploy
(`npx wrangler deploy` in `worker/`) by hand after changing anything under
`worker/`, and apply new migrations with `--remote` first.
