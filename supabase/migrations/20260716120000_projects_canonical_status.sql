-- Canonical project/requirement statuses: open | running | completed | closed
-- Safe remaps of historical values. Does not drop rows. No CHECK constraint
-- added so any unexpected legacy value remains readable until cleaned.

UPDATE projects
SET status = 'running',
    updated_at = NOW()
WHERE lower(trim(status)) IN ('in_progress', 'ongoing', 'active');

UPDATE projects
SET status = 'closed',
    updated_at = NOW()
WHERE lower(trim(status)) IN ('cancelled', 'canceled', 'closed_incomplete');

UPDATE projects
SET status = 'open',
    updated_at = NOW()
WHERE lower(trim(status)) IN ('pending');

COMMENT ON COLUMN projects.status IS
  'Canonical: open | running | completed | closed. Independent of booking status.';
