-- Project archive — projects are archived, not deleted.
--
-- Deleting a project cascades into ledger_entries, which are meant to be an
-- immutable financial record. Policy: a project that has any financial history
-- can only be archived (hidden from lists/pickers/dashboard, fully restorable);
-- the API only allows a hard delete for a project with no ledger entries
-- (e.g. a lead created by mistake). Idempotent.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- Most queries want "not archived"; a partial index keeps the common list fast.
CREATE INDEX IF NOT EXISTS idx_projects_active
  ON projects (created_at DESC)
  WHERE archived_at IS NULL;
