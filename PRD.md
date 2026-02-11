# Product Requirements Document (PRD)
# VoiceBot AI — Vertical AI Receptionist Platform

**Version:** 1.0
**Date:** February 6, 2026
**Stack:** Next.js 14 (App Router) + Supabase + Retell AI + OpenAI

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Database Schema (Supabase)](#3-database-schema-supabase)
4. [Core Modules](#4-core-modules)
5. [Vertical Template System](#5-vertical-template-system)
6. [API Design](#6-api-design)
7. [Pages & UI Screens](#7-pages--ui-screens)
8. [Third-Party Integrations](#8-third-party-integrations)
9. [Voice Agent Pipeline](#9-voice-agent-pipeline)
10. [Chat Widget](#10-chat-widget)
11. [Website Scraper & Knowledge Base](#11-website-scraper--knowledge-base)
12. [Billing & Subscriptions](#12-billing--subscriptions)
13. [Analytics & Reporting](#13-analytics--reporting)
14. [SEO & Marketing Pages](#14-seo--marketing-pages)
15. [Security & Compliance](#15-security--compliance)
16. [Deployment & Infrastructure](#16-deployment--infrastructure)
17. [MVP Phasing](#17-mvp-phasing)
18. [Non-Functional Requirements](#18-non-functional-requirements)

---

## 1. Product Overview

### 1.1 Vision
An AI-powered receptionist platform that combines **website-trained chatbots** and **voice agents** with **industry-specific templates** for small businesses. Customers paste their website URL, select their industry, and get a fully functional AI receptionist (chat + phone) in under 5 minutes.

### 1.2 Target Verticals (Launch Priority)
| Priority | Vertical | Avg Deal Value per Missed Call | Target Price |
|----------|----------|-------------------------------|--------------|
| P0 | Home Services (HVAC, Plumbing, Electrical) | $200-2,000 | $149-249/mo |
| P0 | Dental & Medical Practices | $300-1,500 | $199-299/mo |
| P1 | Legal / Law Firms | $2,000-50,000 | $199-399/mo |
| P1 | Real Estate | $5,000-20,000 | $149-249/mo |
| P2 | Salons / Spas / Fitness | $50-200 | $79-149/mo |
| P2 | E-commerce / SaaS | $50-500 | $99-199/mo |

### 1.3 Core Value Proposition
- **For the customer:** "Paste your URL, pick your industry, get an AI that answers your phone and website chat — trained on YOUR business — in 5 minutes."
- **vs. Human receptionist:** 95% cheaper ($149/mo vs $3,000+/mo)
- **vs. Generic chatbots:** Industry-specific workflows + voice + chat unified
- **vs. Enterprise AI (Ada, Intercom):** 10x cheaper, self-serve setup, SMB-focused

### 1.4 Key Metrics
| Metric | Target |
|--------|--------|
| Time to first working agent | < 5 minutes |
| Chat response latency | < 2 seconds |
| Voice response latency | < 800ms |
| Automated resolution rate | > 70% |
| Customer churn (monthly) | < 5% |
| MRR Month 6 | $6,000-8,000 |
| MRR Month 12 | $10,000-15,000 |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                     │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐   │
│  │Marketing │ │Dashboard │ │  Widget   │ │  Onboarding      │   │
│  │  Pages   │ │   App    │ │  Embed    │ │  Wizard          │   │
│  │ (SSG)    │ │ (SSR)    │ │ (iframe)  │ │  (Client)        │   │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              Next.js API Routes (/api/*)                  │    │
│  │  /api/scrape  /api/chat  /api/voice  /api/agents  ...    │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE BACKEND                          │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐   │
│  │ Postgres │ │   Auth   │ │  Storage  │ │   Edge           │   │
│  │   (DB)   │ │  (Users) │ │  (Files)  │ │   Functions      │   │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐                                       │
│  │ Realtime │ │  pgvector│                                       │
│  │(WebSocket)│ │(Embeddings)                                     │
│  └──────────┘ └──────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ OpenAI   │  │ Retell   │  │ Twilio   │
        │ API      │  │ AI       │  │          │
        │(LLM +   │  │(Voice    │  │(Phone #s │
        │Embeddings)│  │ Agent)   │  │ + SMS)   │
        └──────────┘  └──────────┘  └──────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
  ┌──────────┐    ┌──────────┐
  │ Firecrawl│    │ Stripe   │
  │(Scraper) │    │(Billing) │
  └──────────┘    └──────────┘
```

### 2.2 Tech Stack Detail

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | SSR dashboard, SSG marketing pages, API routes |
| **Styling** | Tailwind CSS + shadcn/ui | Component library |
| **State** | Zustand or React Context | Client state management |
| **Database** | Supabase PostgreSQL + pgvector | All data + vector embeddings |
| **Auth** | Supabase Auth | Email/password + OAuth (Google) |
| **File Storage** | Supabase Storage | Uploaded PDFs, docs, audio recordings |
| **Realtime** | Supabase Realtime | Live chat, dashboard updates |
| **LLM** | OpenAI GPT-4o / GPT-4o-mini | Chat responses, RAG |
| **Embeddings** | OpenAI text-embedding-3-small | Vector embeddings for RAG |
| **Voice** | Retell AI (or Vapi) | Voice agent engine |
| **Telephony** | Twilio (via Retell) | Phone numbers, SMS |
| **Scraping** | Firecrawl API | Website crawling + content extraction |
| **Billing** | Stripe | Subscriptions, usage metering |
| **Email** | Resend | Transactional emails, daily summaries |
| **Queue** | Supabase Edge Functions + pg_cron | Background jobs (scraping, retraining) |
| **Analytics** | PostHog (self-serve) | Product analytics |
| **Hosting** | Vercel | Next.js deployment |
| **CDN** | Vercel Edge | Chat widget delivery |

### 2.3 Key Design Decisions

1. **Supabase pgvector over Pinecone:** Keeps everything in one database. Simpler architecture, lower cost, sufficient performance for SMB-scale (< 100k vectors per customer). Avoids vendor lock-in.

2. **Retell AI over building own voice stack:** Retell handles STT → LLM → TTS pipeline at ~600ms latency. Building this from scratch would take 3+ months. Retell charges ~$0.07-0.15/min — passes through to customer.

3. **Next.js API Routes over separate backend:** For MVP, API routes co-located with frontend reduces complexity. Can extract to separate service later if needed.

4. **Firecrawl over custom scraper:** Handles JavaScript rendering, sitemaps, rate limiting, and content extraction. $19/mo for 3,000 pages — sufficient for MVP.

5. **Edge Functions for async work:** Scraping, embedding generation, and retraining run as background jobs via Supabase Edge Functions triggered by database webhooks or pg_cron.

---

## 3. Database Schema (Supabase)

### 3.1 Complete Schema

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "vector";         -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_cron";        -- Scheduled jobs

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'paused'
);

CREATE TYPE agent_status AS ENUM (
  'draft', 'training', 'active', 'paused', 'error'
);

CREATE TYPE vertical_type AS ENUM (
  'home_services', 'dental_medical', 'legal',
  'real_estate', 'salon_spa', 'ecommerce', 'custom'
);

CREATE TYPE channel_type AS ENUM (
  'chat', 'voice', 'sms', 'whatsapp', 'email'
);

CREATE TYPE conversation_status AS ENUM (
  'active', 'resolved', 'escalated', 'abandoned'
);

CREATE TYPE message_role AS ENUM (
  'user', 'assistant', 'system', 'human_agent'
);

CREATE TYPE call_status AS ENUM (
  'ringing', 'in_progress', 'completed', 'missed',
  'voicemail', 'transferred', 'failed'
);

CREATE TYPE urgency_level AS ENUM (
  'low', 'normal', 'high', 'emergency'
);

CREATE TYPE source_type AS ENUM (
  'website_scrape', 'file_upload', 'manual_text',
  'faq', 'youtube', 'sitemap'
);

CREATE TYPE scrape_status AS ENUM (
  'pending', 'in_progress', 'completed', 'failed'
);

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Organizations / Accounts
CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vertical        vertical_type NOT NULL DEFAULT 'custom',
  website_url     TEXT,
  phone           TEXT,
  email           TEXT,
  address         JSONB,                -- { street, city, state, zip, country }
  business_hours  JSONB,                -- { mon: {open: "09:00", close: "17:00"}, ... }
  timezone        TEXT DEFAULT 'America/New_York',
  logo_url        TEXT,
  settings        JSONB DEFAULT '{}',   -- misc settings
  metadata        JSONB DEFAULT '{}',   -- industry-specific metadata

  -- Stripe
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  subscription_status   subscription_status DEFAULT 'trialing',
  subscription_plan     TEXT,              -- 'chat_only', 'chat_voice', 'professional', 'agency'
  trial_ends_at         TIMESTAMPTZ,

  -- Limits
  monthly_chat_limit      INTEGER DEFAULT 1000,
  monthly_voice_minutes   INTEGER DEFAULT 0,
  monthly_chats_used      INTEGER DEFAULT 0,
  monthly_voice_used      INTEGER DEFAULT 0,
  max_agents              INTEGER DEFAULT 1,
  max_pages               INTEGER DEFAULT 100,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_owner ON organizations(owner_id);
CREATE INDEX idx_org_slug ON organizations(slug);
CREATE INDEX idx_org_stripe ON organizations(stripe_customer_id);

-- Team Members
CREATE TABLE team_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member',   -- 'owner', 'admin', 'member', 'viewer'
  invited_email   TEXT,
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(org_id, user_id)
);

-- ============================================================
-- AI AGENTS
-- ============================================================

CREATE TABLE agents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'AI Receptionist',
  status          agent_status DEFAULT 'draft',
  vertical        vertical_type NOT NULL DEFAULT 'custom',

  -- Personality & Behavior
  system_prompt           TEXT NOT NULL,
  welcome_message         TEXT DEFAULT 'Hi! How can I help you today?',
  voice_welcome_message   TEXT DEFAULT 'Thank you for calling. How can I help you today?',
  fallback_message        TEXT DEFAULT 'I''m not sure about that. Let me connect you with someone who can help.',
  escalation_message      TEXT DEFAULT 'Let me transfer you to a team member.',
  quick_prompts           JSONB DEFAULT '[]',  -- ["Book appointment", "Pricing", "Hours"]
  personality_traits      JSONB DEFAULT '{}',  -- { tone: "friendly", formality: "casual" }

  -- Voice Settings
  voice_enabled           BOOLEAN DEFAULT false,
  voice_id                TEXT,                 -- Retell voice ID
  voice_provider          TEXT DEFAULT 'retell', -- 'retell' | 'vapi'
  retell_agent_id         TEXT,                 -- Retell agent ID
  phone_number            TEXT,                 -- Assigned phone number
  phone_number_sid        TEXT,                 -- Twilio SID
  voice_language          TEXT DEFAULT 'en-US',
  voice_speed             FLOAT DEFAULT 1.0,

  -- Chat Settings
  chat_enabled            BOOLEAN DEFAULT true,
  chat_position           TEXT DEFAULT 'bottom-right', -- widget position
  chat_theme              JSONB DEFAULT '{}',   -- { primaryColor, fontFamily, borderRadius }
  chat_avatar_url         TEXT,
  show_branding           BOOLEAN DEFAULT true,

  -- Behavior Settings
  collect_leads           BOOLEAN DEFAULT true,
  lead_fields             JSONB DEFAULT '["name", "email", "phone"]',
  escalation_enabled      BOOLEAN DEFAULT true,
  escalation_email        TEXT,
  escalation_phone        TEXT,
  business_hours_only     BOOLEAN DEFAULT false,
  after_hours_message     TEXT,
  max_messages_per_convo  INTEGER DEFAULT 50,

  -- Model Settings
  llm_model               TEXT DEFAULT 'gpt-4o-mini',
  temperature             FLOAT DEFAULT 0.3,
  max_tokens              INTEGER DEFAULT 500,

  -- Vertical-Specific Config
  vertical_config         JSONB DEFAULT '{}',

  -- Stats (denormalized for quick access)
  total_conversations     INTEGER DEFAULT 0,
  total_messages          INTEGER DEFAULT 0,
  total_calls             INTEGER DEFAULT 0,
  avg_satisfaction        FLOAT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_org ON agents(org_id);
CREATE INDEX idx_agent_status ON agents(status);

-- ============================================================
-- KNOWLEDGE BASE
-- ============================================================

-- Training Sources
CREATE TABLE training_sources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_type     source_type NOT NULL,
  name            TEXT NOT NULL,           -- display name
  url             TEXT,                    -- for website/youtube sources
  file_path       TEXT,                    -- Supabase storage path
  raw_content     TEXT,                    -- for manual text input
  status          scrape_status DEFAULT 'pending',
  page_count      INTEGER DEFAULT 0,
  char_count      INTEGER DEFAULT 0,
  error_message   TEXT,
  last_synced_at  TIMESTAMPTZ,
  auto_sync       BOOLEAN DEFAULT false,
  sync_frequency  TEXT DEFAULT 'weekly',   -- 'daily', 'weekly', 'monthly'
  metadata        JSONB DEFAULT '{}',

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_source_agent ON training_sources(agent_id);

-- Scraped Pages (individual pages from a source)
CREATE TABLE scraped_pages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id       UUID NOT NULL REFERENCES training_sources(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  url             TEXT,
  title           TEXT,
  content         TEXT NOT NULL,
  content_hash    TEXT,                   -- MD5 hash for change detection
  char_count      INTEGER DEFAULT 0,
  metadata        JSONB DEFAULT '{}',     -- { description, headings, images }

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_page_source ON scraped_pages(source_id);
CREATE INDEX idx_page_agent ON scraped_pages(agent_id);
CREATE INDEX idx_page_hash ON scraped_pages(content_hash);

-- Document Chunks + Embeddings (for RAG)
CREATE TABLE document_chunks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id         UUID REFERENCES scraped_pages(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  token_count     INTEGER,
  chunk_index     INTEGER,                -- position in original document
  embedding       vector(1536),           -- OpenAI text-embedding-3-small
  metadata        JSONB DEFAULT '{}',     -- { source_url, title, section }

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast similarity search
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_chunks_agent ON document_chunks(agent_id);

-- FAQ Entries (manually added or auto-generated)
CREATE TABLE faq_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  question        TEXT NOT NULL,
  answer          TEXT NOT NULL,
  category        TEXT,
  is_auto         BOOLEAN DEFAULT false,  -- auto-generated from content
  priority        INTEGER DEFAULT 0,
  embedding       vector(1536),

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_faq_agent ON faq_entries(agent_id);
CREATE INDEX idx_faq_embedding ON faq_entries
  USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================

CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel         channel_type NOT NULL DEFAULT 'chat',
  status          conversation_status DEFAULT 'active',
  urgency         urgency_level DEFAULT 'normal',

  -- Visitor Info
  visitor_id      TEXT,                   -- anonymous tracking ID
  visitor_name    TEXT,
  visitor_email   TEXT,
  visitor_phone   TEXT,
  visitor_ip      TEXT,
  visitor_location JSONB,                 -- { city, region, country }
  visitor_metadata JSONB DEFAULT '{}',    -- { userAgent, referrer, page_url }

  -- Lead Info
  is_lead         BOOLEAN DEFAULT false,
  lead_captured_at TIMESTAMPTZ,
  lead_fields     JSONB DEFAULT '{}',     -- custom intake fields

  -- Call Info (for voice conversations)
  call_id         TEXT,                   -- Retell call ID
  call_status     call_status,
  call_duration   INTEGER,               -- seconds
  call_recording_url TEXT,
  call_from       TEXT,                   -- caller phone number
  call_to         TEXT,                   -- business phone number
  call_transcript TEXT,                   -- full transcript

  -- Escalation
  escalated       BOOLEAN DEFAULT false,
  escalated_at    TIMESTAMPTZ,
  escalated_to    TEXT,                   -- email or phone
  escalation_reason TEXT,

  -- Satisfaction
  satisfaction_rating INTEGER,            -- 1-5
  satisfaction_feedback TEXT,

  -- Vertical-specific
  vertical_data   JSONB DEFAULT '{}',     -- e.g., { case_type, insurance, service_needed }

  -- Stats
  message_count   INTEGER DEFAULT 0,
  first_response_time INTEGER,           -- ms
  resolution_time INTEGER,               -- seconds

  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_convo_agent ON conversations(agent_id);
CREATE INDEX idx_convo_org ON conversations(org_id);
CREATE INDEX idx_convo_status ON conversations(status);
CREATE INDEX idx_convo_channel ON conversations(channel);
CREATE INDEX idx_convo_created ON conversations(created_at DESC);
CREATE INDEX idx_convo_visitor ON conversations(visitor_email);

-- Messages
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role            message_role NOT NULL,
  content         TEXT NOT NULL,
  
  -- RAG metadata
  sources_used    JSONB DEFAULT '[]',     -- [{ chunk_id, score, snippet }]
  confidence      FLOAT,                  -- 0-1 confidence score
  
  -- Feedback
  thumbs_up       BOOLEAN,
  feedback_text   TEXT,
  
  -- For voice messages
  audio_url       TEXT,
  duration        INTEGER,               -- ms
  
  tokens_used     INTEGER,
  latency_ms      INTEGER,               -- response generation time

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_msg_convo ON messages(conversation_id);
CREATE INDEX idx_msg_created ON messages(created_at);
CREATE INDEX idx_msg_agent ON messages(agent_id);

-- ============================================================
-- LEADS
-- ============================================================

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  channel         channel_type,
  
  -- Contact Info
  name            TEXT,
  email           TEXT,
  phone           TEXT,
  
  -- Lead Details
  source_page     TEXT,                   -- which page they chatted from
  intent          TEXT,                   -- "book_appointment", "get_quote", "general_inquiry"
  score           INTEGER DEFAULT 0,      -- 0-100 lead score
  notes           TEXT,
  
  -- Vertical-specific
  vertical_data   JSONB DEFAULT '{}',
  -- home_services: { service_type, urgency, property_type, description }
  -- dental: { patient_type, insurance, reason_for_visit, preferred_time }
  -- legal: { case_type, brief_description, timeline }
  -- real_estate: { buyer_seller, budget, area, timeline }
  
  -- Status
  status          TEXT DEFAULT 'new',     -- 'new', 'contacted', 'qualified', 'converted', 'lost'
  followed_up     BOOLEAN DEFAULT false,
  followed_up_at  TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_org ON leads(org_id);
CREATE INDEX idx_lead_status ON leads(status);
CREATE INDEX idx_lead_created ON leads(created_at DESC);

-- ============================================================
-- APPOINTMENTS / SCHEDULING
-- ============================================================

CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id),
  conversation_id UUID REFERENCES conversations(id),
  
  -- Details
  title           TEXT NOT NULL,
  description     TEXT,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  
  -- Contact
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  
  -- Calendar Sync
  external_calendar_id TEXT,             -- Google Calendar / Outlook event ID
  calendar_provider    TEXT,             -- 'google', 'outlook', 'cal_com'
  
  -- Status
  status          TEXT DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'canceled', 'completed', 'no_show'
  reminder_sent   BOOLEAN DEFAULT false,
  
  -- Vertical-specific
  appointment_type TEXT,                  -- 'consultation', 'service_call', 'showing', etc.
  vertical_data   JSONB DEFAULT '{}',
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appt_org ON appointments(org_id);
CREATE INDEX idx_appt_time ON appointments(start_time);

-- ============================================================
-- VERTICAL TEMPLATES
-- ============================================================

CREATE TABLE vertical_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vertical        vertical_type NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  icon            TEXT,
  
  -- Default Agent Configuration
  default_system_prompt       TEXT NOT NULL,
  default_welcome_message     TEXT,
  default_voice_welcome       TEXT,
  default_quick_prompts       JSONB DEFAULT '[]',
  default_lead_fields         JSONB DEFAULT '[]',
  default_personality         JSONB DEFAULT '{}',
  default_vertical_config     JSONB DEFAULT '{}',
  
  -- Template Content
  sample_faqs                 JSONB DEFAULT '[]',   -- [{ q, a }]
  intake_form_schema          JSONB DEFAULT '{}',   -- JSON schema for intake forms
  escalation_rules            JSONB DEFAULT '[]',   -- [{ trigger, action }]
  routing_rules               JSONB DEFAULT '[]',   -- [{ condition, route_to }]
  compliance_notices          JSONB DEFAULT '[]',   -- [{ type, text }]
  
  -- Voice Defaults
  recommended_voice_id        TEXT,
  voice_script_templates      JSONB DEFAULT '{}',
  
  -- Suggested Integrations
  suggested_integrations      JSONB DEFAULT '[]',   -- ["google_calendar", "housecall_pro"]
  
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INTEGRATIONS
-- ============================================================

CREATE TABLE integrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,          -- 'google_calendar', 'outlook', 'zapier', 'housecall_pro', etc.
  status          TEXT DEFAULT 'connected', -- 'connected', 'disconnected', 'error'
  
  -- OAuth tokens (encrypted)
  access_token    TEXT,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Config
  config          JSONB DEFAULT '{}',     -- provider-specific settings
  webhook_url     TEXT,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id, provider)
);

-- ============================================================
-- ANALYTICS (Aggregated Daily)
-- ============================================================

CREATE TABLE daily_analytics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  
  -- Chat Metrics
  chat_conversations    INTEGER DEFAULT 0,
  chat_messages         INTEGER DEFAULT 0,
  chat_resolved         INTEGER DEFAULT 0,
  chat_escalated        INTEGER DEFAULT 0,
  chat_avg_response_ms  INTEGER,
  
  -- Voice Metrics
  voice_calls           INTEGER DEFAULT 0,
  voice_minutes         FLOAT DEFAULT 0,
  voice_answered        INTEGER DEFAULT 0,
  voice_missed          INTEGER DEFAULT 0,
  voice_transferred     INTEGER DEFAULT 0,
  voice_avg_duration    INTEGER,          -- seconds
  
  -- Lead Metrics
  leads_captured        INTEGER DEFAULT 0,
  appointments_booked   INTEGER DEFAULT 0,
  
  -- Satisfaction
  avg_satisfaction      FLOAT,
  thumbs_up_count       INTEGER DEFAULT 0,
  thumbs_down_count     INTEGER DEFAULT 0,
  
  -- Top Questions
  top_questions         JSONB DEFAULT '[]',  -- [{ question, count, answered }]
  unanswered_questions  JSONB DEFAULT '[]',  -- [{ question, count }]
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(agent_id, date)
);

CREATE INDEX idx_analytics_org_date ON daily_analytics(org_id, date DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own organization's data
CREATE POLICY "org_access" ON organizations
  FOR ALL USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT org_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "agent_access" ON agents
  FOR ALL USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT org_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- (Repeat similar policies for all tables - abbreviated for clarity)

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Similarity search function for RAG
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  p_agent_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.agent_id = p_agent_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to search FAQs
CREATE OR REPLACE FUNCTION match_faqs(
  query_embedding vector(1536),
  p_agent_id UUID,
  match_threshold FLOAT DEFAULT 0.8,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fe.id,
    fe.question,
    fe.answer,
    1 - (fe.embedding <=> query_embedding) AS similarity
  FROM faq_entries fe
  WHERE fe.agent_id = p_agent_id
    AND 1 - (fe.embedding <=> query_embedding) > match_threshold
  ORDER BY fe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Increment usage counters
CREATE OR REPLACE FUNCTION increment_chat_usage(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE organizations
  SET monthly_chats_used = monthly_chats_used + 1
  WHERE id = p_org_id;
END;
$$;

-- Reset monthly usage (called by pg_cron on 1st of each month)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE organizations
  SET monthly_chats_used = 0, monthly_voice_used = 0;
END;
$$;

-- Schedule monthly reset
SELECT cron.schedule('reset-usage', '0 0 1 * *', 'SELECT reset_monthly_usage()');
```

---

## 4. Core Modules

### 4.1 Module Map

```
src/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # Public marketing pages (SSG)
│   │   ├── page.tsx              # Homepage
│   │   ├── pricing/
│   │   ├── features/
│   │   ├── industries/
│   │   │   ├── home-services/
│   │   │   ├── dental/
│   │   │   ├── legal/
│   │   │   └── real-estate/
│   │   ├── blog/
│   │   ├── compare/
│   │   │   ├── sitegpt-alternative/
│   │   │   ├── ruby-receptionists-alternative/
│   │   │   └── smith-ai-alternative/
│   │   └── tools/
│   │       ├── missed-call-calculator/
│   │       └── ai-readiness-checker/
│   │
│   ├── (auth)/                   # Auth pages
│   │   ├── login/
│   │   ├── signup/
│   │   └── forgot-password/
│   │
│   ├── (dashboard)/              # Authenticated dashboard
│   │   ├── layout.tsx            # Dashboard shell (sidebar + nav)
│   │   ├── page.tsx              # Dashboard home / overview
│   │   ├── agents/
│   │   │   ├── page.tsx          # List agents
│   │   │   ├── new/             # Create agent wizard
│   │   │   └── [agentId]/
│   │   │       ├── page.tsx      # Agent overview
│   │   │       ├── training/     # Knowledge base management
│   │   │       ├── chat-settings/
│   │   │       ├── voice-settings/
│   │   │       ├── leads/
│   │   │       ├── conversations/
│   │   │       │   └── [conversationId]/
│   │   │       ├── analytics/
│   │   │       └── settings/
│   │   ├── conversations/        # All conversations (cross-agent)
│   │   ├── leads/                # All leads
│   │   ├── appointments/         # All appointments
│   │   ├── analytics/            # Global analytics
│   │   ├── integrations/         # Manage integrations
│   │   ├── billing/              # Subscription & usage
│   │   ├── settings/             # Org settings
│   │   └── onboarding/           # First-time setup wizard
│   │
│   ├── api/                      # API Routes
│   │   ├── chat/                 # Chat endpoint (used by widget)
│   │   │   └── route.ts
│   │   ├── voice/                # Voice webhook handlers
│   │   │   ├── retell/
│   │   │   │   ├── webhook/route.ts    # Retell event webhooks
│   │   │   │   └── llm/route.ts        # Retell LLM websocket
│   │   │   └── status/route.ts
│   │   ├── scrape/               # Website scraping
│   │   │   ├── route.ts          # Start scrape
│   │   │   └── status/route.ts   # Check scrape progress
│   │   ├── embed/                # Embed generation
│   │   │   └── route.ts
│   │   ├── agents/
│   │   │   └── [...]/route.ts
│   │   ├── leads/
│   │   │   └── route.ts
│   │   ├── appointments/
│   │   │   └── route.ts
│   │   ├── integrations/
│   │   │   ├── google-calendar/
│   │   │   └── zapier/
│   │   ├── billing/
│   │   │   ├── checkout/route.ts
│   │   │   ├── portal/route.ts
│   │   │   └── webhook/route.ts   # Stripe webhooks
│   │   └── cron/
│   │       ├── daily-summary/route.ts
│   │       ├── auto-sync/route.ts
│   │       └── analytics-aggregate/route.ts
│   │
│   └── widget/                   # Chat widget (separate entry point)
│       └── [agentId]/
│           └── page.tsx          # Embeddable widget page
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── dashboard/                # Dashboard-specific components
│   │   ├── Sidebar.tsx
│   │   ├── AgentCard.tsx
│   │   ├── ConversationList.tsx
│   │   ├── ConversationView.tsx
│   │   ├── LeadTable.tsx
│   │   ├── AnalyticsCharts.tsx
│   │   └── OnboardingWizard.tsx
│   ├── widget/                   # Chat widget components
│   │   ├── ChatWidget.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── LeadForm.tsx
│   │   └── QuickPrompts.tsx
│   └── marketing/                # Marketing page components
│       ├── Hero.tsx
│       ├── PricingTable.tsx
│       ├── VerticalShowcase.tsx
│       └── ROICalculator.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   ├── admin.ts              # Admin client (service role)
│   │   └── middleware.ts         # Auth middleware
│   ├── ai/
│   │   ├── openai.ts             # OpenAI client
│   │   ├── embeddings.ts         # Generate embeddings
│   │   ├── rag.ts                # RAG pipeline
│   │   ├── chat-handler.ts       # Chat message processing
│   │   └── prompt-builder.ts     # Dynamic prompt construction
│   ├── voice/
│   │   ├── retell.ts             # Retell AI client
│   │   ├── phone-numbers.ts      # Phone number management
│   │   └── call-handler.ts       # Voice call processing
│   ├── scraper/
│   │   ├── firecrawl.ts          # Firecrawl client
│   │   ├── chunker.ts            # Text chunking logic
│   │   └── processor.ts          # Content processing pipeline
│   ├── integrations/
│   │   ├── google-calendar.ts
│   │   ├── stripe.ts
│   │   ├── resend.ts
│   │   └── zapier.ts
│   ├── templates/
│   │   ├── index.ts              # Template registry
│   │   ├── home-services.ts
│   │   ├── dental.ts
│   │   ├── legal.ts
│   │   ├── real-estate.ts
│   │   ├── salon.ts
│   │   └── ecommerce.ts
│   └── utils/
│       ├── rate-limiter.ts
│       ├── usage-tracker.ts
│       └── helpers.ts
│
├── hooks/
│   ├── useAgent.ts
│   ├── useConversation.ts
│   ├── useRealtime.ts
│   └── useAnalytics.ts
│
└── types/
    ├── database.ts               # Generated from Supabase
    ├── agents.ts
    ├── conversations.ts
    └── templates.ts
```

---

## 5. Vertical Template System

### 5.1 Template Data Structure

Each template is a TypeScript object that pre-configures an agent:

```typescript
// lib/templates/home-services.ts

import { VerticalTemplate } from '@/types/templates';

export const homeServicesTemplate: VerticalTemplate = {
  vertical: 'home_services',
  name: 'Home Services',
  description: 'HVAC, Plumbing, Electrical, Roofing & more',
  icon: '🔧',

  defaultSystemPrompt: `You are a friendly, professional AI receptionist for {{business_name}}, 
a {{service_type}} company serving the {{service_area}} area.

Your primary goals:
1. Answer questions about services, pricing, and availability using the knowledge base
2. Capture leads by collecting caller/visitor information
3. Determine urgency — is this an emergency (e.g., burst pipe, no heat in winter, electrical fire)?
4. Schedule appointments or service calls
5. Provide service area confirmation

EMERGENCY HANDLING:
- If the caller describes an emergency (flooding, gas leak, no heat/AC in extreme weather, 
  electrical hazard), immediately:
  1. Acknowledge the urgency: "That sounds urgent. Let me help right away."
  2. Collect their address and phone number
  3. Send emergency alert to the business owner
  4. Provide any immediate safety advice if applicable

NON-EMERGENCY HANDLING:
- Collect: name, phone, email, address, description of the issue
- Offer to schedule a service appointment
- Provide estimated response time if available in knowledge base

ALWAYS:
- Confirm service area before scheduling ("We serve within {{service_radius}} of {{city}}")
- Be warm and reassuring — callers are often stressed about home issues
- If you don't know the answer, say "Let me have a technician get back to you on that"
- Never make up pricing — only quote if it's in the knowledge base`,

  defaultWelcomeMessage:
    "Hi! 👋 I'm the virtual assistant for {{business_name}}. Need to schedule a service call, get a quote, or have a question? I'm here to help!",

  defaultVoiceWelcome:
    "Thank you for calling {{business_name}}. I'm an AI assistant and I can help you schedule a service call, answer questions, or connect you with our team. How can I help you today?",

  defaultQuickPrompts: [
    "Schedule a service call",
    "Get a quote",
    "Emergency — I need help now",
    "What areas do you serve?",
    "What are your hours?"
  ],

  defaultLeadFields: [
    { key: "name", label: "Full Name", type: "text", required: true },
    { key: "phone", label: "Phone Number", type: "phone", required: true },
    { key: "email", label: "Email", type: "email", required: false },
    { key: "address", label: "Service Address", type: "text", required: true },
    { key: "service_type", label: "Service Needed", type: "select",
      options: ["HVAC", "Plumbing", "Electrical", "Roofing", "Other"],
      required: true },
    { key: "urgency", label: "Urgency", type: "select",
      options: ["Emergency", "This week", "Flexible"],
      required: true },
    { key: "description", label: "Describe the issue", type: "textarea", required: false }
  ],

  defaultPersonality: {
    tone: "warm_professional",
    formality: "casual",
    empathy_level: "high",
    verbosity: "concise"
  },

  sampleFAQs: [
    { q: "What areas do you serve?", a: "We serve {{service_area}}. If you're not sure if we cover your area, just give us your zip code!" },
    { q: "Do you offer emergency services?", a: "Yes! We offer 24/7 emergency service. If you have an urgent issue, just let me know and I'll get someone to you as quickly as possible." },
    { q: "Do you offer free estimates?", a: "{{free_estimates_answer}}" },
    { q: "What are your hours?", a: "{{business_hours_answer}}" },
    { q: "Are you licensed and insured?", a: "{{licensing_answer}}" },
    { q: "What forms of payment do you accept?", a: "{{payment_methods}}" }
  ],

  intakeFormSchema: {
    emergency: {
      fields: ["name", "phone", "address", "issue_description"],
      urgency: "emergency",
      auto_alert: true,
      alert_method: ["sms", "email"]
    },
    service_request: {
      fields: ["name", "phone", "email", "address", "service_type", "preferred_date", "description"],
      urgency: "normal",
      auto_alert: false
    }
  },

  escalationRules: [
    { trigger: "emergency_keywords", keywords: ["emergency", "flood", "gas leak", "no heat", "fire", "burst pipe", "electrical shock"],
      action: "immediate_alert", method: "sms_and_email" },
    { trigger: "pricing_question", action: "soft_escalate",
      message: "For detailed pricing, I'll have our team get back to you shortly." },
    { trigger: "frustrated_customer", action: "offer_human",
      message: "I understand this is frustrating. Would you like me to connect you with a team member?" }
  ],

  suggestedIntegrations: [
    "google_calendar",
    "housecall_pro",
    "servicetitan",
    "jobber",
    "zapier"
  ],

  recommendedVoiceId: "11labs_rachel",  // warm, friendly female voice
  
  voiceScriptTemplates: {
    after_hours: "You've reached {{business_name}} after hours. I'm an AI assistant and I can still help you. If this is an emergency, please describe the issue and I'll alert our on-call technician right away. Otherwise, I can schedule a callback for the next business day.",
    on_hold: "Thank you for holding. I'm looking into that for you right now.",
    transfer: "I'm going to connect you with one of our team members now. Please hold for just a moment."
  },

  seoKeywords: [
    "ai answering service hvac",
    "ai receptionist plumber",
    "virtual receptionist home services",
    "after hours answering service contractor",
    "ai phone answering for electricians"
  ]
};
```

### 5.2 All 6 Vertical Template Summaries

| Vertical | System Prompt Focus | Key Intake Fields | Escalation Triggers | Unique Features |
|----------|-------------------|-------------------|-------------------|-----------------|
| **Home Services** | Emergency detection, service area check, appointment booking | Address, service type, urgency, issue description | Emergency keywords, frustrated customer | Emergency SMS alert, service area validation |
| **Dental/Medical** | New patient intake, insurance check, appointment types | Insurance provider, patient type (new/existing), reason for visit | Pain/emergency, insurance not accepted | HIPAA notice, insurance verification Q&A, appointment reminders |
| **Legal** | Client intake, case type routing, confidentiality | Case type, brief description, timeline, opposing party | Conflict of interest flag, emotional distress | Confidentiality disclaimer, practice area routing, consultation booking |
| **Real Estate** | Lead qualification, property inquiries, showing scheduling | Buyer/seller, budget range, preferred area, timeline | High-value lead (budget > threshold) | Agent round-robin routing, property link follow-up via SMS |
| **Salon/Spa** | Service menu, stylist matching, booking | Service type, preferred stylist, preferred time | Cancellation within 24hrs | Service menu display, booking with specific provider, cancellation policy |
| **E-commerce** | Order tracking, product recommendations, returns | Order number, product question, return reason | Refund request, shipping complaint | Shopify/WooCommerce order lookup, return initiation |

---

## 6. API Design

### 6.1 Public APIs (Used by Chat Widget & Voice)

```
POST   /api/chat                    # Send chat message (widget → server)
       Body: { agent_id, conversation_id?, message, visitor_id }
       Returns: { response, conversation_id, sources[] }

GET    /api/chat/history             # Get conversation history
       Query: { conversation_id }

POST   /api/leads/capture            # Capture lead from widget
       Body: { agent_id, conversation_id, fields: {} }

POST   /api/voice/retell/llm         # Retell LLM WebSocket endpoint
       (WebSocket upgrade - handles real-time voice conversations)

POST   /api/voice/retell/webhook     # Retell event webhooks
       Body: { event, call_id, data }
       Events: call.started, call.ended, call.analyzed
```

### 6.2 Dashboard APIs (Authenticated)

```
# Agents
GET    /api/agents                   # List agents for org
POST   /api/agents                   # Create agent
GET    /api/agents/:id               # Get agent details
PATCH  /api/agents/:id               # Update agent
DELETE /api/agents/:id               # Delete agent

# Training / Knowledge Base
POST   /api/agents/:id/scrape        # Start website scrape
GET    /api/agents/:id/scrape/status  # Get scrape progress
POST   /api/agents/:id/sources       # Add training source (file/text)
DELETE /api/agents/:id/sources/:sid   # Remove training source
POST   /api/agents/:id/retrain       # Trigger re-embedding

# Conversations
GET    /api/conversations             # List conversations (filters: channel, status, date)
GET    /api/conversations/:id         # Get conversation + messages
PATCH  /api/conversations/:id         # Update status (resolve, escalate)

# Leads
GET    /api/leads                     # List leads (filters: status, date, score)
PATCH  /api/leads/:id                 # Update lead status
POST   /api/leads/:id/follow-up      # Send follow-up email/SMS

# Appointments
GET    /api/appointments              # List appointments
POST   /api/appointments              # Create appointment
PATCH  /api/appointments/:id          # Update/cancel appointment

# Analytics
GET    /api/analytics/overview        # Dashboard overview metrics
GET    /api/analytics/daily           # Daily breakdown
GET    /api/analytics/unanswered      # Unanswered questions report

# Voice
POST   /api/voice/provision-number    # Provision new phone number
DELETE /api/voice/release-number      # Release phone number
GET    /api/voice/calls               # List call logs
GET    /api/voice/calls/:id/recording # Get call recording

# Billing
POST   /api/billing/checkout          # Create Stripe checkout session
POST   /api/billing/portal            # Create Stripe portal session
POST   /api/billing/webhook           # Stripe webhook handler

# Integrations
GET    /api/integrations              # List connected integrations
POST   /api/integrations/:provider/connect
DELETE /api/integrations/:provider/disconnect
```

### 6.3 Chat API Flow (Detailed)

```typescript
// app/api/chat/route.ts

export async function POST(req: Request) {
  const { agent_id, conversation_id, message, visitor_id, metadata } = await req.json();

  // 1. Rate limit check
  // 2. Usage limit check (monthly_chats_used < monthly_chat_limit)

  // 3. Get or create conversation
  let convo = conversation_id
    ? await getConversation(conversation_id)
    : await createConversation({ agent_id, visitor_id, channel: 'chat', metadata });

  // 4. Save user message
  await saveMessage({ conversation_id: convo.id, role: 'user', content: message });

  // 5. Get agent config
  const agent = await getAgent(agent_id);

  // 6. Generate embedding for the query
  const queryEmbedding = await generateEmbedding(message);

  // 7. RAG: Search knowledge base
  const relevantDocs = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    p_agent_id: agent_id,
    match_threshold: 0.7,
    match_count: 5
  });

  // 8. Search FAQs
  const matchedFAQs = await supabase.rpc('match_faqs', {
    query_embedding: queryEmbedding,
    p_agent_id: agent_id,
    match_threshold: 0.8,
    match_count: 3
  });

  // 9. Build prompt with context
  const systemPrompt = buildPrompt({
    agent,
    relevantDocs: relevantDocs.data,
    matchedFAQs: matchedFAQs.data,
    conversationHistory: await getRecentMessages(convo.id, 10),
    verticalConfig: agent.vertical_config
  });

  // 10. Call LLM
  const response = await openai.chat.completions.create({
    model: agent.llm_model,
    temperature: agent.temperature,
    max_tokens: agent.max_tokens,
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ]
  });

  const assistantMessage = response.choices[0].message.content;

  // 11. Save assistant message
  await saveMessage({
    conversation_id: convo.id,
    role: 'assistant',
    content: assistantMessage,
    sources_used: relevantDocs.data?.map(d => ({
      chunk_id: d.id, score: d.similarity, snippet: d.content.slice(0, 100)
    })),
    tokens_used: response.usage?.total_tokens,
    latency_ms: Date.now() - startTime
  });

  // 12. Check for escalation triggers
  await checkEscalationTriggers(agent, message, assistantMessage, convo);

  // 13. Check for lead capture opportunity
  await checkLeadCapture(agent, convo);

  // 14. Increment usage
  await incrementChatUsage(agent.org_id);

  // 15. Return response
  return Response.json({
    response: assistantMessage,
    conversation_id: convo.id,
    sources: relevantDocs.data?.map(d => ({ title: d.metadata?.title, url: d.metadata?.source_url }))
  });
}
```

---

## 7. Pages & UI Screens

### 7.1 Onboarding Wizard (Critical for conversion)

```
Step 1: Select Industry
┌─────────────────────────────────────────────┐
│  What type of business do you run?           │
│                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │   🔧    │  │   🦷    │  │   ⚖️    │     │
│  │  Home   │  │ Dental/ │  │  Legal  │     │
│  │Services │  │ Medical │  │         │     │
│  └─────────┘  └─────────┘  └─────────┘     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │   🏠    │  │   💇    │  │   🛒    │     │
│  │  Real   │  │ Salon/  │  │  E-com  │     │
│  │ Estate  │  │   Spa   │  │         │     │
│  └─────────┘  └─────────┘  └─────────┘     │
│                                              │
│            [ Other / Custom ]                │
└─────────────────────────────────────────────┘

Step 2: Your Website
┌─────────────────────────────────────────────┐
│  Paste your website URL                      │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ https://acmeplumbing.com            │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  [ Scan My Website →]                        │
│                                              │
│  ⏳ Scanning... Found 23 pages               │
│  ✅ Services page                            │
│  ✅ About us                                 │
│  ✅ FAQ                                      │
│  ✅ Contact info                             │
│  ... 19 more pages                           │
└─────────────────────────────────────────────┘

Step 3: Preview Your AI Agent
┌─────────────────────────────────────────────┐
│  Meet your AI Receptionist! 🎉              │
│                                              │
│  Try asking it a question:                   │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │  🤖 Hi! I'm the virtual assistant   │    │
│  │  for Acme Plumbing. Need to          │    │
│  │  schedule a service call or have     │    │
│  │  a question? I'm here to help!       │    │
│  │                                      │    │
│  │  [Schedule service] [Get quote]      │    │
│  │  [Emergency help]  [Service areas]   │    │
│  │                                      │    │
│  │  You: Do you fix water heaters?      │    │
│  │                                      │    │
│  │  🤖 Yes! Acme Plumbing offers water  │    │
│  │  heater repair and installation...    │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  🔊 [Call to hear your voice agent]          │
│     Call (555) 123-4567                      │
│                                              │
│  [ Customize ] [ Go Live → ]                 │
└─────────────────────────────────────────────┘

Step 4: Go Live
┌─────────────────────────────────────────────┐
│  You're all set! Here's how to go live:      │
│                                              │
│  💬 CHAT WIDGET                              │
│  Copy this code to your website:             │
│  ┌──────────────────────────────────────┐   │
│  │ <script src="https://yourdomain.com  │   │
│  │  /widget/abc123.js"></script>         │   │
│  └──────────────────────────────────────┘   │
│  [Copy Code] [WordPress Plugin] [Webflow]   │
│                                              │
│  📞 VOICE AGENT                              │
│  Your AI phone number: (555) 123-4567       │
│  Forward your business line, or add as       │
│  after-hours overflow.                       │
│  [How to set up call forwarding →]          │
│                                              │
│  [ Go to Dashboard → ]                       │
└─────────────────────────────────────────────┘
```

### 7.2 Dashboard Pages

| Page | Key Components | Data Source |
|------|---------------|-------------|
| **Overview** | Total conversations today, voice minutes used, leads captured, satisfaction score, recent conversations list, quick actions | `daily_analytics` + `conversations` (last 24h) |
| **Agents List** | Agent cards with status, stats, quick toggle on/off | `agents` table |
| **Agent Detail** | Tabbed view: Overview, Training, Chat Settings, Voice Settings, Conversations, Leads, Analytics | `agents` + related tables |
| **Training / KB** | Source list (URLs, files), scrape status, page count, retrain button, FAQ editor | `training_sources` + `scraped_pages` + `faq_entries` |
| **Conversations** | Filterable list (channel, status, date), conversation viewer with full history, escalation actions | `conversations` + `messages` |
| **Leads** | Table view with filters, lead detail panel, follow-up actions, export CSV | `leads` table |
| **Appointments** | Calendar view + list view, sync status, reschedule/cancel | `appointments` table |
| **Analytics** | Charts: conversations over time, resolution rate, top questions, unanswered questions, voice call metrics, lead conversion funnel | `daily_analytics` |
| **Integrations** | Available integrations grid, connected status, setup guides | `integrations` table |
| **Billing** | Current plan, usage meters, upgrade CTA, invoice history | Stripe API + `organizations` |
| **Settings** | Business info, team members, notification preferences, embed code, API keys | `organizations` + `team_members` |

---

## 8. Third-Party Integrations

### 8.1 Integration Priority

| Priority | Integration | Purpose | Implementation |
|----------|------------|---------|----------------|
| **P0 (MVP)** | Stripe | Billing | Stripe SDK + webhooks |
| **P0** | OpenAI | LLM + Embeddings | API client |
| **P0** | Retell AI | Voice agent | REST API + WebSocket |
| **P0** | Firecrawl | Web scraping | REST API |
| **P0** | Resend | Transactional email | REST API |
| **P1** | Google Calendar | Appointment booking | OAuth + Calendar API |
| **P1** | Twilio | SMS notifications | REST API |
| **P1** | Zapier | Custom workflows | Zapier app (triggers + actions) |
| **P2** | Outlook Calendar | Appointment booking | Microsoft Graph API |
| **P2** | Housecall Pro | Home services CRM | REST API |
| **P2** | Dentrix/Open Dental | Dental practice mgmt | API/integration |
| **P2** | Clio | Legal practice mgmt | REST API |
| **P2** | Shopify | E-commerce | Storefront API |
| **P3** | WhatsApp Business | Messaging channel | WhatsApp Cloud API |
| **P3** | Facebook Messenger | Messaging channel | Messenger Platform |
| **P3** | Slack | Internal notifications | Slack API |
| **P3** | HubSpot | CRM | REST API |

### 8.2 Zapier Integration Design

Expose these **Triggers** and **Actions** via Zapier:

**Triggers (events from your platform):**
- New conversation started
- New lead captured
- Appointment booked
- Call completed
- Conversation escalated

**Actions (things Zapier can do in your platform):**
- Create/update lead
- Add FAQ entry
- Send message in conversation
- Update agent settings

This is critical because it lets users connect to 5,000+ apps without you building each integration.

---

## 9. Voice Agent Pipeline

### 9.1 Retell AI Integration Architecture

```
Incoming Call (Twilio → Retell)
        │
        ▼
┌──────────────┐
│  Retell AI   │
│  Voice Agent │
│              │
│  STT → LLM → TTS
│       ↕
│  WebSocket to your server
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────┐
│  YOUR SERVER                      │
│  POST /api/voice/retell/llm      │
│                                   │
│  1. Receive transcribed text      │
│  2. Look up agent config          │
│  3. RAG search (same as chat)     │
│  4. Build prompt + context        │
│  5. Stream LLM response back      │
│  6. Retell converts to speech     │
│                                   │
│  Additionally:                    │
│  - Log conversation               │
│  - Check escalation triggers      │
│  - Capture lead info from speech  │
│  - Handle call transfer requests  │
└──────────────────────────────────┘
```

### 9.2 Retell LLM WebSocket Handler

```typescript
// app/api/voice/retell/llm/route.ts

import { WebSocket } from 'ws';

export async function GET(req: Request) {
  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);

  let agentConfig: Agent | null = null;
  let conversationHistory: Message[] = [];
  let callId: string | null = null;

  socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    if (data.interaction_type === 'call_details') {
      // Initial call setup - extract agent_id from metadata
      callId = data.call_id;
      agentConfig = await getAgentByPhoneNumber(data.to_number);

      // Create conversation record
      const convo = await createConversation({
        agent_id: agentConfig.id,
        channel: 'voice',
        call_id: callId,
        call_from: data.from_number,
        call_to: data.to_number
      });

      // Send initial greeting
      socket.send(JSON.stringify({
        response_type: 'response',
        content: agentConfig.voice_welcome_message,
        content_complete: true
      }));
      return;
    }

    if (data.interaction_type === 'response_required') {
      const userMessage = data.transcript;

      // RAG pipeline (same as chat)
      const queryEmbedding = await generateEmbedding(userMessage);
      const relevantDocs = await matchDocuments(queryEmbedding, agentConfig.id);
      const matchedFAQs = await matchFAQs(queryEmbedding, agentConfig.id);

      // Build prompt
      const systemPrompt = buildVoicePrompt({
        agent: agentConfig,
        relevantDocs,
        matchedFAQs,
        conversationHistory
      });

      // Stream response back to Retell
      const stream = await openai.chat.completions.create({
        model: agentConfig.llm_model,
        temperature: agentConfig.temperature,
        max_tokens: 200,  // Keep voice responses short
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage }
        ]
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;

        // Stream each chunk to Retell for real-time TTS
        socket.send(JSON.stringify({
          response_type: 'response',
          content: content,
          content_complete: false
        }));
      }

      // Signal completion
      socket.send(JSON.stringify({
        response_type: 'response',
        content: '',
        content_complete: true
      }));

      // Update conversation history
      conversationHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: fullResponse }
      );

      // Check escalation triggers (async)
      checkVoiceEscalation(agentConfig, userMessage, fullResponse);
    }
  };

  socket.onclose = async () => {
    // Save full conversation to database
    if (callId) {
      await saveVoiceConversation(callId, conversationHistory);
    }
  };

  return response;
}
```

### 9.3 Phone Number Provisioning Flow

```
User clicks "Enable Voice" in dashboard
        │
        ▼
1. Call Retell API → create_agent({
     llm_websocket_url: "https://yourapp.com/api/voice/retell/llm",
     voice_id: template.recommendedVoiceId,
     agent_name: org.name
   })
        │
        ▼
2. Call Retell API → create_phone_number({
     agent_id: retell_agent_id,
     area_code: user_preferred_area_code   // or auto from business address
   })
        │
        ▼
3. Save to database:
   - agents.retell_agent_id = retell_agent_id
   - agents.phone_number = provisioned_number
   - agents.voice_enabled = true
        │
        ▼
4. Show user their number + call forwarding instructions
```

---

## 10. Chat Widget

### 10.1 Widget Architecture

The chat widget is a lightweight JavaScript snippet that loads an iframe:

```html
<!-- Customer embeds this on their website -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['VoiceBotWidget']=o;w[o]=w[o]||function(){
    (w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','vbot','https://widget.yourdomain.com/loader.js'));
  vbot('init', { agentId: 'AGENT_ID_HERE' });
</script>
```

**Widget features:**
- Floating button (position configurable)
- Chat window (iframe for style isolation)
- Quick prompt buttons
- Lead capture form (slides in when triggered)
- Typing indicator
- Message history (persisted via localStorage visitor_id)
- Satisfaction rating (on close)
- "Powered by [Brand]" badge (removable on paid plans)
- Customizable colors, avatar, position
- Mobile responsive
- Dark mode support

### 10.2 Widget Tech

- Built as a separate Next.js page: `/widget/[agentId]/page.tsx`
- Loaded in an iframe for CSS isolation
- Communication with parent page via `postMessage`
- Real-time updates via Supabase Realtime subscription
- Visitor ID stored in localStorage for continuity
- Bundle size target: < 50KB gzipped

---

## 11. Website Scraper & Knowledge Base

### 11.1 Scraping Pipeline

```
User enters URL
      │
      ▼
┌─────────────────┐
│  1. CRAWL       │  Firecrawl API
│  - Discover all │  POST /v1/crawl
│    pages from   │  { url, limit: 100, scrapeOptions: { formats: ["markdown"] }}
│    sitemap/link │
│    following     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. EXTRACT     │  Firecrawl returns markdown content per page
│  - Clean HTML   │
│  - Extract text │
│  - Get metadata │
│  - Remove nav/  │
│    footer/ads   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. CHUNK       │  lib/scraper/chunker.ts
│  - Split into   │  Strategy: Recursive character splitting
│    ~500 token   │  - Split by: \n\n → \n → sentence → word
│    chunks       │  - Chunk size: 500 tokens
│  - Overlap: 50  │  - Overlap: 50 tokens
│    tokens       │  - Preserve headings as metadata
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. EMBED       │  OpenAI text-embedding-3-small
│  - Generate     │  Batch process: 100 chunks per API call
│    vector for   │  Rate limit: 3,000 RPM
│    each chunk   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. STORE       │  Supabase
│  - Save pages   │  INSERT into scraped_pages
│  - Save chunks  │  INSERT into document_chunks (with embeddings)
│    + embeddings │  UPDATE training_sources status
│  - Update stats │
└─────────────────┘
```

### 11.2 Auto-Sync (Retraining)

- `pg_cron` job checks for sources with `auto_sync = true`
- Based on `sync_frequency`, triggers re-scrape
- On re-scrape, content is compared via `content_hash` (MD5)
- Only changed pages are re-chunked and re-embedded
- Old chunks from changed pages are deleted, new ones inserted

---

## 12. Billing & Subscriptions

### 12.1 Plans

| Plan | Monthly Price | Chat Messages | Voice Minutes | Phone Numbers | Agents | Pages |
|------|-------------|--------------|---------------|--------------|--------|-------|
| **Starter** | $49 | 1,000 | — | — | 1 | 50 |
| **Pro** | $149 | 5,000 | 500 | 1 | 3 | 200 |
| **Business** | $249 | Unlimited | 2,000 | 3 | 10 | 500 |
| **Agency** | $499 | Unlimited | 5,000 | 10 | 25 | 1,000 |

**Additional charges:**
- Extra voice minutes: $0.15/min
- Extra phone numbers: $5/mo each
- Remove branding (Starter/Pro): $20/mo add-on

### 12.2 Stripe Implementation

```
Stripe Products:
├── prod_starter    → price_starter_monthly ($49)
├── prod_pro        → price_pro_monthly ($149), price_pro_annual ($1,490)
├── prod_business   → price_business_monthly ($249), price_business_annual ($2,490)
├── prod_agency     → price_agency_monthly ($499), price_agency_annual ($4,990)
└── prod_voice_overage → price_voice_per_min ($0.15) [metered]

Webhook Events to Handle:
├── checkout.session.completed     → Create/update subscription
├── customer.subscription.updated  → Plan change
├── customer.subscription.deleted  → Cancellation
├── invoice.paid                   → Record payment
├── invoice.payment_failed         → Mark past_due, send email
└── customer.subscription.trial_will_end → Send trial ending email
```

---

## 13. Analytics & Reporting

### 13.1 Dashboard Metrics

**Overview Cards:**
- Total conversations (24h / 7d / 30d)
- Voice calls answered vs missed
- Leads captured
- Average satisfaction score
- Voice minutes used / remaining
- Chat messages used / remaining

**Charts:**
- Conversations over time (line chart, by channel)
- Resolution rate trend
- Top 10 most asked questions (bar chart)
- Unanswered questions (table — these suggest knowledge gaps)
- Lead conversion funnel (visitors → conversations → leads → appointments)
- Peak hours heatmap (when do most calls/chats happen)

### 13.2 Daily Email Summary

Sent via Resend at 8 AM in customer's timezone:

```
Subject: Your AI Receptionist Report — Jan 15

📊 Yesterday's Summary for Acme Plumbing

💬 Chat: 23 conversations, 21 resolved (91%)
📞 Voice: 8 calls answered, 12 min total, 1 transferred
👤 Leads: 4 new leads captured
📅 Appointments: 2 booked

❓ Top Questions:
1. "Do you service the 75201 area?" (5 times) ✅ Answered
2. "How much does drain cleaning cost?" (3 times) ⚠️ Partially answered
3. "Are you available this weekend?" (3 times) ✅ Answered

🔴 Unanswered Questions (consider adding to your FAQ):
- "Do you offer financing?" (2 times)
- "Can you install a tankless water heater?" (1 time)

[View Full Dashboard →]
```

---

## 14. SEO & Marketing Pages

### 14.1 Page Structure

```
/                                       # Homepage
/pricing                                # Pricing page
/features                               # Features overview
/industries/home-services               # Vertical landing page
/industries/dental                      # Vertical landing page
/industries/legal                       # Vertical landing page
/industries/real-estate                 # Vertical landing page
/industries/salon-spa                   # Vertical landing page
/industries/ecommerce                   # Vertical landing page
/ai-receptionist-for-[industry]         # SEO: 20+ programmatic pages
/ai-answering-service-for-[industry]    # SEO: 20+ programmatic pages
/virtual-receptionist-for-[city]        # SEO: 50+ local pages
/compare/[competitor]-alternative       # SEO: 10+ comparison pages
/compare/[us]-vs-[competitor]           # SEO: 10+ vs pages
/tools/missed-call-calculator           # Lead magnet tool
/tools/ai-readiness-checker             # Lead magnet tool
/blog                                   # Blog listing
/blog/[slug]                            # Blog posts
/demo                                   # Live demo page
```

### 14.2 Programmatic SEO Templates

Generate pages for these keyword patterns:

| Pattern | Example | Volume/Competition |
|---------|---------|-------------------|
| `ai receptionist for [industry]` | ai receptionist for dentists | Med/Low |
| `ai answering service for [industry]` | ai answering service for plumbers | Med/Low |
| `virtual receptionist for [industry]` | virtual receptionist for law firms | High/Med |
| `ai phone answering [city]` | ai phone answering Dallas | Low/Low |
| `[competitor] alternative` | ruby receptionists alternative | Med/Low |
| `best ai receptionist for [industry]` | best ai receptionist for HVAC | Low/Low |
| `after hours answering service [industry]` | after hours answering service electricians | Med/Low |

Each page dynamically fills in vertical-specific content, testimonials, features, and pricing.

---

## 15. Security & Compliance

### 15.1 Security Requirements

| Requirement | Implementation |
|-------------|---------------|
| Authentication | Supabase Auth (JWT) + RLS |
| Authorization | Row Level Security on all tables |
| API Security | Rate limiting (upstash/ratelimit), API key auth for widget |
| Data Encryption | Supabase encrypts at rest; TLS for transit |
| Secrets Management | Vercel environment variables (encrypted) |
| CORS | Strict CORS on widget API (allow customer domains only) |
| Input Validation | Zod schemas on all API inputs |
| SQL Injection | Parameterized queries via Supabase client |
| XSS | React auto-escapes; CSP headers on widget |

### 15.2 Compliance

| Standard | Scope | Implementation |
|----------|-------|----------------|
| **GDPR** | EU customers | Data deletion API, cookie consent on widget, DPA with Supabase |
| **HIPAA** | Dental/Medical vertical | BAA with Supabase (available on Pro plan), encrypted PHI, audit logs, no PHI in logs |
| **CCPA** | California customers | Privacy policy, data deletion request handling |
| **SOC 2** | Enterprise customers | Inherit from Supabase + Vercel SOC 2 compliance |

**HIPAA Notes:**
- For dental/medical vertical, must use Supabase Pro with HIPAA BAA
- Call recordings stored encrypted in Supabase Storage
- No PHI in application logs
- Conversation data encrypted at rest
- Add HIPAA compliance disclaimer in medical template

---

## 16. Deployment & Infrastructure

### 16.1 Environment Setup

```
Environments:
├── Development   → localhost:3000 + Supabase local (Docker)
├── Staging       → staging.yourdomain.com + Supabase staging project
└── Production    → app.yourdomain.com + Supabase production project

Domain Structure:
├── yourdomain.com           → Marketing pages (Vercel)
├── app.yourdomain.com       → Dashboard (Vercel)
├── widget.yourdomain.com    → Chat widget (Vercel Edge)
└── api.yourdomain.com       → API routes (Vercel Serverless)
```

### 16.2 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Retell AI
RETELL_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Firecrawl
FIRECRAWL_API_KEY=

# Resend
RESEND_API_KEY=

# Twilio (if needed separately from Retell)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_WIDGET_URL=
CRON_SECRET=          # For securing cron endpoints
```

### 16.3 Estimated Monthly Infrastructure Costs

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro | $20/mo |
| Supabase | Pro | $25/mo |
| OpenAI | Usage-based | ~$50-200/mo (scales with customers) |
| Retell AI | Usage-based | ~$0.07-0.15/min (passes through to customer) |
| Firecrawl | Starter | $19/mo |
| Resend | Free tier → Pro | $0-20/mo |
| Domain | — | $12/year |
| **Total (launch)** | | **~$120-300/mo** |
| **Total (at $10k MRR)** | | **~$500-1,500/mo** |

---

## 17. MVP Phasing

### Phase 1: Core MVP (Weeks 1-4)
**Goal:** Working chat agent with website training + basic dashboard

- [ ] Supabase project setup (schema, RLS, functions)
- [ ] Auth (signup, login, forgot password)
- [ ] Onboarding wizard (select vertical → paste URL → preview)
- [ ] Website scraper integration (Firecrawl)
- [ ] Chunking + embedding pipeline
- [ ] RAG chat endpoint (`/api/chat`)
- [ ] Basic chat widget (embeddable iframe)
- [ ] Dashboard: agent overview, conversation list, conversation viewer
- [ ] 2 vertical templates (Home Services + Dental)
- [ ] Stripe integration (checkout + webhook)
- [ ] Basic analytics (message counts)

### Phase 2: Voice + Polish (Weeks 5-8)
**Goal:** Voice agent working, lead capture, email summaries

- [ ] Retell AI integration (LLM WebSocket handler)
- [ ] Phone number provisioning flow
- [ ] Voice conversation logging
- [ ] Lead capture in chat widget
- [ ] Lead management page
- [ ] Daily email summary (Resend)
- [ ] FAQ editor (manual add/edit)
- [ ] Widget customization (colors, position, avatar)
- [ ] Embed code generator
- [ ] File upload training (PDF, DOCX)
- [ ] Legal + Real Estate templates

### Phase 3: Integrations + Growth (Weeks 9-12)
**Goal:** Calendar sync, Zapier, marketing pages, SEO

- [ ] Google Calendar integration
- [ ] Appointment booking flow (chat + voice)
- [ ] Zapier integration (triggers + actions)
- [ ] SMS notifications (Twilio)
- [ ] Auto-sync / retraining (pg_cron)
- [ ] Analytics dashboard (charts, trends)
- [ ] Marketing pages (homepage, pricing, features)
- [ ] Vertical landing pages (6 pages)
- [ ] SEO programmatic pages (20+ pages)
- [ ] Comparison pages (5+ competitor pages)
- [ ] Blog setup + first 10 posts
- [ ] Salon + E-commerce templates

### Phase 4: Scale + Optimize (Weeks 13-16)
**Goal:** Agency features, advanced analytics, optimization

- [ ] White-label / agency plan
- [ ] Multi-agent support
- [ ] Team member management
- [ ] Advanced analytics (unanswered questions, knowledge gaps)
- [ ] Call recording playback
- [ ] Conversation search
- [ ] Satisfaction surveys
- [ ] WhatsApp channel
- [ ] Missed call calculator tool (SEO lead magnet)
- [ ] A/B test prompts (system prompt variants)
- [ ] Performance optimization (widget load time, response latency)

---

## 18. Non-Functional Requirements

### 18.1 Performance

| Metric | Target |
|--------|--------|
| Chat widget load time | < 1.5s |
| Chat response time (P95) | < 3s |
| Voice response latency (P95) | < 800ms |
| Dashboard page load (P95) | < 2s |
| Widget JS bundle size | < 50KB gzipped |
| Scraping: 100 pages | < 5 minutes |
| Embedding: 100 chunks | < 30 seconds |
| Uptime | 99.9% |

### 18.2 Scalability

| Dimension | MVP Target | Growth Target |
|-----------|-----------|---------------|
| Concurrent chat sessions | 100 | 10,000 |
| Concurrent voice calls | 10 | 1,000 |
| Total agents | 200 | 10,000 |
| Total document chunks | 500K | 10M |
| Messages per day | 10K | 1M |

### 18.3 Monitoring

- **Error tracking:** Sentry
- **Uptime monitoring:** BetterUptime or UptimeRobot
- **Performance:** Vercel Analytics + Web Vitals
- **Product analytics:** PostHog (user behavior, funnels)
- **Log aggregation:** Vercel Logs (or Axiom for production)
- **Alerting:** PagerDuty or Opsgenie (for production incidents)

---

*End of PRD v1.0*

*Next steps: Share with engineering team, prioritize Phase 1 tasks, set up project board, begin sprint planning.*
