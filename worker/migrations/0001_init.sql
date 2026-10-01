-- Shared groups: a capability-style secret (only its hash is stored) lets every
-- phone in the group read and write the group's docs. No accounts.
CREATE TABLE groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  -- bumped once per push; docs carry the rev they were written at so a pull
  -- is "everything with rev > my cursor"
  rev         INTEGER NOT NULL DEFAULT 0
);

-- Players, custom games and finished sessions, stored as opaque JSON.
-- Last write wins on updated_at (the client's edit time).
CREATE TABLE docs (
  group_id   TEXT NOT NULL,
  kind       TEXT NOT NULL,
  id         TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  rev        INTEGER NOT NULL,
  data       TEXT NOT NULL,
  PRIMARY KEY (group_id, kind, id)
);
CREATE INDEX docs_by_rev ON docs (group_id, rev);

-- Live scoreboards: the host phone pushes the running game, viewers poll.
-- Rows idle for 48 h are swept by the daily cron.
CREATE TABLE live (
  code       TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX live_by_age ON live (updated_at);
