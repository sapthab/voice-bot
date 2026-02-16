-- Migration: Add tables and columns for 4 differentiating features
-- Run this against your Supabase database

-- 1. Add new columns to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS booking_enabled boolean DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS booking_settings jsonb DEFAULT null;

-- 2. Add new column to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS post_processing_status text DEFAULT null
  CHECK (post_processing_status IN ('pending', 'processing', 'completed', 'failed'));

-- 3. Conversation Analysis table (Phase 1: Analytics)
CREATE TABLE IF NOT EXISTS conversation_analysis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  sentiment text NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  sentiment_score numeric NOT NULL DEFAULT 0,
  topics text[] DEFAULT '{}',
  summary text NOT NULL DEFAULT '',
  resolution_status text DEFAULT 'unknown' CHECK (resolution_status IN ('resolved', 'escalated', 'unresolved', 'unknown')),
  knowledge_gaps text[] DEFAULT '{}',
  confidence_avg numeric DEFAULT 0.5,
  key_phrases text[] DEFAULT '{}',
  customer_intent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_analysis_conversation_id ON conversation_analysis(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analysis_agent_id ON conversation_analysis(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analysis_created_at ON conversation_analysis(created_at);

-- 4. Analytics Aggregates table (Phase 1: Analytics)
CREATE TABLE IF NOT EXISTS analytics_aggregates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  period_start timestamptz NOT NULL,
  total_conversations integer DEFAULT 0,
  avg_duration numeric,
  resolution_rate numeric DEFAULT 0,
  escalation_rate numeric DEFAULT 0,
  avg_sentiment_score numeric DEFAULT 0,
  top_topics jsonb DEFAULT '[]',
  total_leads integer DEFAULT 0,
  channel_breakdown jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, period, period_start)
);

CREATE INDEX IF NOT EXISTS idx_analytics_aggregates_agent_period ON analytics_aggregates(agent_id, period, period_start);

-- 5. Followup Configs table (Phase 2: Follow-ups)
CREATE TABLE IF NOT EXISTS followup_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  enabled boolean DEFAULT false,
  delay_minutes integer DEFAULT 0,
  template_subject text,
  template_body text NOT NULL,
  from_name text,
  from_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followup_configs_agent_id ON followup_configs(agent_id);

-- 6. Followup Deliveries table (Phase 2: Follow-ups)
CREATE TABLE IF NOT EXISTS followup_deliveries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  followup_config_id uuid NOT NULL REFERENCES followup_configs(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  external_id text,
  error_message text,
  recipient text NOT NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followup_deliveries_config_id ON followup_deliveries(followup_config_id);
CREATE INDEX IF NOT EXISTS idx_followup_deliveries_conversation_id ON followup_deliveries(conversation_id);

-- 7. Integrations table (Phase 3: CRM Integrations)
CREATE TABLE IF NOT EXISTS integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('hubspot', 'webhook')),
  name text NOT NULL,
  enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}',
  field_mapping jsonb DEFAULT '{}',
  enabled_events text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integrations_agent_id ON integrations(agent_id);

-- 8. Webhook Deliveries table (Phase 3: CRM Integrations)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  response_code integer,
  response_body text,
  attempts integer DEFAULT 0,
  next_retry_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_integration_id ON webhook_deliveries(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status_retry ON webhook_deliveries(status, next_retry_at) WHERE status = 'failed';

-- 9. Calendar Connections table (Phase 4: Appointment Booking)
CREATE TABLE IF NOT EXISTS calendar_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE UNIQUE,
  provider text DEFAULT 'google' CHECK (provider IN ('google')),
  encrypted_tokens text NOT NULL,
  calendar_id text NOT NULL,
  calendar_name text,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_agent_id ON calendar_connections(agent_id);

-- 10. Appointments table (Phase 4: Appointment Booking)
CREATE TABLE IF NOT EXISTS appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  calendar_connection_id uuid NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  external_event_id text NOT NULL,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  customer_name text,
  customer_email text,
  customer_phone text,
  notes text,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'rescheduled', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_agent_id ON appointments(agent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Enable RLS on new tables (adjust policies as needed for your auth setup)
ALTER TABLE conversation_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access for API routes using service role key)
CREATE POLICY "Service role full access" ON conversation_analysis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON analytics_aggregates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON followup_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON followup_deliveries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON integrations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON webhook_deliveries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON calendar_connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON appointments FOR ALL USING (true) WITH CHECK (true);
