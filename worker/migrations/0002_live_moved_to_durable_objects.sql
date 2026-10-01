-- Live games now live in the Room Durable Object (src/room.js), which adds
-- WebSockets and join-to-score. The D1 table is no longer used.
DROP INDEX IF EXISTS live_by_age;
DROP TABLE IF EXISTS live;
