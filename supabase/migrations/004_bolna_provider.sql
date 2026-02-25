-- Add Bolna as a voice provider option

-- Expand voice_provider check constraint to include 'bolna'
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_voice_provider_check;
ALTER TABLE agents ADD CONSTRAINT agents_voice_provider_check
  CHECK (voice_provider IN ('retell', 'bolna'));

-- Add bolna_agent_id column for Bolna provider agent mapping
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bolna_agent_id TEXT;
CREATE INDEX IF NOT EXISTS idx_agents_bolna_agent_id ON agents(bolna_agent_id);

-- Track which provider was used for each conversation
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS voice_provider TEXT;
