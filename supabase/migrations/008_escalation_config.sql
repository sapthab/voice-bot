-- 008_escalation_config.sql
-- Per-agent escalation contact info.
-- When a conversation is escalated the system notifies these contacts
-- and the AI acknowledges the handoff to the customer.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS escalation_email TEXT,
  ADD COLUMN IF NOT EXISTS escalation_phone TEXT;
