# AGENTS.md

Guidance for coding agents working in this repository. Human-facing docs live
in [`README.md`](README.md) and [`worker/README.md`](worker/README.md).

## Setup commands

```sh
npm install
npm run dev      # Vite dev server
npm test         # Vitest — pure logic only (scoring, stats, i18n)
npm run build    # tsc -b (type-check) + production build to dist/
```

There is no linter. `npm test` and `npm run build` are the checks; run both
before declaring frontend work done. CI runs them plus the worker tests.

Worker commands run from `worker/`:

```sh
npm test             # node:test on node:sqlite — no npm dependencies
npx wrangler dev     # local worker (apply migrations with --local first)
npx wrangler deploy  # CI does NOT deploy the worker
```

## Architecture

Local-first React SPA on GitHub Pages plus an optional Cloudflare Worker with D1.

- **`src/lib/store.ts`** is the single source of truth. It holds localStorage
  collections (`players`, `games` = custom only, `sessions`) behind
  `useSyncExternalStore`. Every write goes through `put()`, which stamps
  `updatedAt` and marks the doc **dirty** for sync.
- **`src/lib/scoring.ts`** computes totals, standings and the tie-break for all
  three modes (`counter` = tap log, `rounds` = array of per-round maps, `sheet`
  = category × player). Screens never sum scores themselves.
- **`src/lib/cloud.ts`** handles groups, sync and live scoreboards. Everything
  is a no-op when `VITE_API_URL` is empty (`cloudEnabled`).
- **`worker/src/worker.js`** runs on D1 with three tables (see
  `worker/migrations/`).
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
- **No passwords or accounts.** A group is a capability: whoever has the invite
  link is in. Only secret hashes are stored server-side.

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
- Dark mode is class-based. Both `src/hooks/useTheme.ts` and the inline script
  in `index.html` toggle `.dark`, and the script reads the
  `dice-digits:settings` key. Change one, change the other.
- `vite.config.ts` uses `base: './'`. Reference public assets relatively.
- `public/icons/icon.svg` is the master icon. Its drawing also lives in
  `src/components/Logo.tsx`. The PNGs are rendered from the SVG.

## Code style

2-space indent, single quotes, no semicolons, named exports only, hooks in
`src/hooks/`, shared types in `src/types.ts`, screens in `src/screens/`.

## Deployment

Push to `main` → tests + build → GitHub Pages. Run the worker deploy
(`npx wrangler deploy` in `worker/`) by hand after changing anything under
`worker/`, and apply new migrations with `--remote` first.
