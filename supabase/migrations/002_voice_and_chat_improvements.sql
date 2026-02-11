-- Voice fields for agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS voice_id TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS retell_agent_id TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS phone_number_sid TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS voice_language TEXT DEFAULT 'en-US';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS voice_speed FLOAT DEFAULT 1.0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS voice_welcome_message TEXT DEFAULT 'Hello! Thank you for calling. How can I help you today?';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS voice_provider TEXT DEFAULT 'retell' CHECK (voice_provider IN ('retell'));

-- Channel and call fields for conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'chat' CHECK (channel IN ('chat', 'voice', 'sms'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS call_id TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS call_status TEXT CHECK (call_status IN ('ringing', 'in_progress', 'completed', 'failed', 'no_answer'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS call_duration INTEGER;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS call_recording_url TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS call_from TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS call_to TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS call_transcript TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

-- Metadata fields for messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sources_used JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS confidence FLOAT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS latency_ms INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tokens_used INTEGER;

-- Indexes for voice lookups
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_call_id ON conversations(call_id);
CREATE INDEX IF NOT EXISTS idx_agents_phone_number ON agents(phone_number);
CREATE INDEX IF NOT EXISTS idx_agents_retell_agent_id ON agents(retell_agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_escalated ON conversations(escalated) WHERE escalated = true;
