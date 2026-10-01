# Dice & Digits API (Cloudflare Worker + D1)

Optional backend for shared groups and live scoreboards. The app works without
it; with `VITE_API_URL` empty the cloud UI is simply hidden.

## One-time setup

```sh
npx wrangler login
npx wrangler d1 create dice-and-digits
# paste the printed database_id into wrangler.toml → [[d1_databases]]
npx wrangler d1 migrations apply dice-and-digits --remote
npx wrangler deploy
```

Put the deployed URL (e.g. `https://dice-and-digits-api.<subdomain>.workers.dev`)
into the repo's `.env` as `VITE_API_URL` and push to `main`.

If the app is served from another origin, add it to `ALLOWED_ORIGINS` in
`wrangler.toml` and redeploy.

## Endpoints

| Method   | Path               | Auth            | Purpose                                     |
| -------- | ------------------ | --------------- | ------------------------------------------- |
| `POST`   | `/api/groups`      | origin          | `{ name }` → `{ id, secret, name }`          |
| `GET`    | `/api/groups/me`   | group token     | `{ id, name }`, used to preview an invite   |
| `POST`   | `/api/sync`        | group token     | `{ cursor, docs[] }` → `{ cursor, docs[], more }` |
| `POST`   | `/api/live`        | origin          | `{ data }` → `{ code, token }`               |
| `GET`    | `/api/live/:code`  | none            | `{ data, updatedAt }`                        |
| `PUT`    | `/api/live/:code`  | live token      | replace `data`                              |
| `DELETE` | `/api/live/:code`  | live token      | end the live scoreboard                     |

- **Group token** = `Authorization: Bearer <groupId>.<secret>`. The secret
  travels only in the invite link (`#/join/<groupId>.<secret>`); D1 stores its
  SHA-256.
- **Sync** is a push and a pull in one call. Each push bumps the group's `rev`,
  and every doc written in it carries that rev. A pull returns `rev > cursor`
  and never ends a page in the middle of a rev. The upsert's `WHERE
  excluded.updated_at > docs.updated_at` makes it last-write-wins, whichever
  phone syncs first.
- **Origin** gating: browser writes must come from `ALLOWED_ORIGINS`. It is not
  authentication (curl can send any Origin), only a deterrent. The size and
  count caps in `LIMITS` are what bound abuse.

## Limits (`LIMITS` in `src/worker.js`)

200 docs per push, 64 KB per doc, 20,000 docs per group, 500 docs per pull
page, 64 KB per live payload. Live scoreboards idle for 48 h are deleted by the
daily cron (`17 3 * * *`).

## Schema changes

Add a new file under `migrations/` (never edit an applied one), then:

```sh
npx wrangler d1 migrations apply dice-and-digits --remote
```

The tests load every migration in order, so they cover the new schema too.

## Tests and logs

```sh
npm test            # node:test, runs the real SQL on node:sqlite (Node ≥ 22.5)
npx wrangler tail   # live logs from the deployed worker
```
