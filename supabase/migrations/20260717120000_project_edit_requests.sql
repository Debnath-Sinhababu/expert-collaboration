-- Institution project edits with active bookings require admin approval.

CREATE TABLE IF NOT EXISTS project_edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  proposed_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_note TEXT,
  reviewed_by_admin_id UUID REFERENCES super_admin_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_edit_requests_project_id
  ON project_edit_requests(project_id);

CREATE INDEX IF NOT EXISTS idx_project_edit_requests_status
  ON project_edit_requests(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_edit_requests_one_pending_per_project
  ON project_edit_requests(project_id)
  WHERE status = 'pending';

COMMENT ON TABLE project_edit_requests IS
  'Queued institution edits to projects that already have bookings; applied only after admin approval.';
