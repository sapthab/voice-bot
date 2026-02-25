-- 006_delayed_followups.sql
-- Support scheduled/delayed follow-up deliveries without a job queue.
-- The process-followups internal route polls for due pending deliveries.

ALTER TABLE followup_deliveries
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS rendered_body TEXT,
  ADD COLUMN IF NOT EXISTS rendered_subject TEXT;

-- Index for efficiently polling due deliveries
CREATE INDEX IF NOT EXISTS idx_followup_deliveries_pending_due
  ON followup_deliveries(scheduled_for)
  WHERE status = 'pending';
