# Dice & Digits

A mobile-first score keeper for board game night, in **Polish and English**.
Installable as a PWA, works offline, hosted on GitHub Pages, with an optional
Cloudflare Worker for shared groups and live scoreboards.

## Features

**Scoring: three modes cover almost every game**

| Mode            | How it works                                                   | Good for                                |
| --------------- | -------------------------------------------------------------- | --------------------------------------- |
| **Counter**     | Big `+`/`−` buttons per player, quick steps, every tap logged  | Catan, Carcassonne, Splendor            |
| **Rounds**      | Enter everyone's points after each round; edit any past round  | Tysiąc, Uno, Scrabble, Rummy            |
| **Score sheet** | Category × player pad filled in at the end, with auto bonuses  | 7 Wonders, Wingspan, Yahtzee, Cascadia  |

- **14 built-in games** with their real score categories (7 Cudów Świata, Na
  skrzydłach, Terraformacja Marsa, Wsiąść do pociągu, Tysiąc, Yahtzee with the
  upper-section +35 bonus, …), plus **your own games** with custom categories,
  "counts as minus" categories, quick buttons, a target score and lowest-wins.
- **Own number pad**, because the iOS numeric keyboard has no minus key and
  negative scores are routine (Tysiąc, failed tickets).
- Leader crown, a target-reached banner, undo, a per-tap history, and a
  **tie-break** picker on the results screen (or keep the shared victory).
- **Screen stays on** during a game (Wake Lock), haptic taps on Android.

**After the game**

- Podium + results, round/sheet breakdown, notes, "play again" with the same
  lineup, share the result as text.
- **History** grouped by day, filterable by game.
- **Stats**: games played, time played, a win-rate leaderboard, per-game records
  and average winning score, **head-to-head** between any two players.

**Table tools**: dice roller (d4–d20, coin), **finger picker** for the first
player (everyone touches the screen, one is chosen), and a tap-to-restart
**turn timer**.

**Optional cloud** (needs the worker):

- **Shared group**: friends join by invite link; players, custom games and
  finished games sync across everyone's phones, so the stats are shared.
- **Live scoreboard**: share a link and anyone can follow the running game on
  their own phone.

**Everything else**: PL/EN (auto-detected, switchable), auto/light/dark theme
without a flash, JSON backup export/import, offline after first load, and an
"update ready" prompt so a new deploy never reloads mid-game.

## Stack

React 19 + Vite + TypeScript + Tailwind v4, the same as
[ev_parking_app](https://github.com/imrahil/ev_parking_app). Additions:
`vite-plugin-pwa` (offline precache), `lucide-react` (icons), Vitest (logic
tests). Backend: a Cloudflare Worker + **D1** (SQLite). D1 rather than KV
because sync writes on every finished game, and KV's free tier allows 1,000
writes/day while D1 allows 100,000.

```
           phone (localStorage, works offline)
              │  POST /api/sync      (finished games, players, custom games)
              │  POST/PUT /api/live  (running game, debounced)
              ▼
     Cloudflare Worker ──► D1: groups · docs · live
              ▲
              │  GET /api/live/:code every 4 s
        friend's phone (read-only live view)
```

Data is **local-first**: the app is fully usable without the worker. Sync is
last-write-wins per document on its `updatedAt`.

## Local development

```sh
npm install
npm run dev      # Vite dev server
npm test         # Vitest: scoring, stats, i18n
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

Worker (see [`worker/README.md`](worker/README.md)):

```sh
cd worker
npm test                     # node:test against real SQLite, no dependencies
npx wrangler d1 migrations apply dice-and-digits --local
npx wrangler dev             # http://localhost:8787
```

To run the app against the local worker, set `VITE_API_URL=http://localhost:8787`
in `.env.local`.

## Deployment

**Frontend**: push to `main`. `.github/workflows/deploy.yml` runs both test
suites, builds, and publishes `dist/` to GitHub Pages. Enable Pages once under
*Settings → Pages → Source: GitHub Actions*. The app lands at
`https://imrahil.github.io/dice-and-digits/`.

**Backend** (one-time; also after any change under `worker/`):

```sh
cd worker
npx wrangler login
npx wrangler d1 create dice-and-digits        # paste database_id into wrangler.toml
npx wrangler d1 migrations apply dice-and-digits --remote
npx wrangler deploy
```

Then put the printed worker URL into `.env` as `VITE_API_URL` and push. The
value is public, which is why `.env` is committed.

## Free plan vs. the $5 Workers Paid plan

The free plan is enough for a group of friends: 100k requests/day, and D1 at
5M rows read and 100k rows written per day. A 90-minute live game with three
viewers polling every 4 s costs about 4,000 requests. Upgrading to Paid would
make sense for:

- **Real-time live scoreboards** over WebSockets with Durable Objects, instead
  of 4 s polling.
- **Rate limiting** on group creation and sync.
- Much higher D1 and request limits if the app is shared publicly.

## Persisted data

All in `localStorage` under the `dice-digits:` prefix: `players`, `games`
(custom only), `sessions`, `settings`, `dirty` (pending sync), `group` (shared
group credentials), `live` (live scoreboard tokens). Export/import in *More →
Backup* moves everything between devices without the cloud.
