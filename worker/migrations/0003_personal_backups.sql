-- Personal backups ("vaults"): a group of one, opened by a typeable recovery
-- code. The group id is derived from the code, so the code alone restores it.
ALTER TABLE groups ADD COLUMN kind TEXT NOT NULL DEFAULT 'group';
