-- 007_sms_channel.sql
-- Enable SMS channel on agents.
-- Agents reuse their existing Twilio phone_number for SMS alongside voice.
-- Configure the Twilio number's SMS webhook URL to: /api/sms/webhook

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agents_sms_phone ON agents(phone_number)
  WHERE sms_enabled = true;
