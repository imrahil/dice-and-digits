# Dice & Digits API (Cloudflare Worker + D1 + Durable Objects)

Optional backend for shared groups (D1) and live games (one Durable Object
per game, `src/room.js`). The app works without it; with `VITE_API_URL` empty
the cloud UI is simply hidden.

## One-time setup

```sh
npx wrangler login
npx wrangler d1 create dice-and-digits
# paste the printed database_id into wrangler.toml → [[d1_databases]]
npx wrangler d1 migrations apply dice-and-digits --remote
npx wrangler deploy     # also creates the Room Durable Object class ([[migrations]] v1)
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
| `POST`   | `/api/live`        | origin          | `{ data: { session } }` → `{ code, token }` |
| `GET`    | `/api/live/:code`  | none            | `{ data: { session }, updatedAt, host }`     |
| `PUT`    | `/api/live/:code`  | live token      | replace the session (used for the final state) |
| `DELETE` | `/api/live/:code`  | live token      | end the live game, disconnect everyone       |
| `GET`    | `/api/live/:code/ws` | origin        | WebSocket into the game's Room               |

- **Group token** = `Authorization: Bearer <groupId>.<secret>`. The secret
  travels only in the invite link (`#/join/<groupId>.<secret>`); D1 stores its
  SHA-256.
- **Sync** is a push and a pull in one call. Each push bumps the group's `rev`,
  and every doc written in it carries that rev. A pull returns `rev > cursor`
  and never ends a page in the middle of a rev. The upsert's `WHERE
  excluded.updated_at > docs.updated_at` makes it last-write-wins, whichever
  phone syncs first.
- **Live games** are Room Durable Objects named by the 6-character code. The
  host phone stays authoritative: players who joined a seat send *ops*, the
  room queues them and relays them to the host, and the host applies them and
  pushes the new session, which the room broadcasts. The full message protocol
  is documented at the top of `src/room.js`. Rooms idle for 48 h delete
  themselves through a Durable Object alarm. The router reaches the room
  through an internal `fetch` (`POST /rpc/<name>`) rather than Workers RPC, so
  the class has no `cloudflare:workers` import and runs unmodified in
  `node:test`.
- **Origin** gating: browser writes must come from `ALLOWED_ORIGINS`. It is not
  authentication (curl can send any Origin), only a deterrent. The size and
  count caps in `LIMITS` are what bound abuse.

## Limits (`LIMITS` in `src/worker.js`)

200 docs per push, 64 KB per doc, 20,000 docs per group, 500 docs per pull
page, 128 KB per live session. Rooms (`ROOM_LIMITS` in `src/room.js`): 192 KB
per WebSocket frame, 500 queued ops, 48 h idle lifetime.

## Schema changes

Add a new file under `migrations/` (never edit an applied one), then:

```sh
npx wrangler d1 migrations apply dice-and-digits --remote
```

The tests load every migration in order, so they cover the new schema too.

## Tests and logs

```sh
npm test            # node:test: real SQL on node:sqlite, Room with a fake DO context (Node ≥ 22.5)
npx wrangler tail   # live logs from the deployed worker
```
