-- Add unified language field to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en-US';
