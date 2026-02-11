export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: 'trialing' | 'active' | 'canceled' | 'past_due'
          plan: 'free' | 'starter' | 'professional' | 'enterprise'
          chat_credits_used: number
          chat_credits_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: 'trialing' | 'active' | 'canceled' | 'past_due'
          plan?: 'free' | 'starter' | 'professional' | 'enterprise'
          chat_credits_used?: number
          chat_credits_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: 'trialing' | 'active' | 'canceled' | 'past_due'
          plan?: 'free' | 'starter' | 'professional' | 'enterprise'
          chat_credits_used?: number
          chat_credits_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          default_organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          default_organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          default_organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          vertical: 'general' | 'home_services' | 'dental' | 'medical' | 'legal' | 'real_estate' | 'restaurant' | 'ecommerce'
          website_url: string | null
          system_prompt: string | null
          welcome_message: string
          fallback_message: string
          widget_color: string
          widget_position: 'bottom-right' | 'bottom-left'
          widget_title: string
          widget_subtitle: string | null
          lead_capture_enabled: boolean
          lead_capture_fields: Json
          lead_capture_message: string
          is_active: boolean
          is_trained: boolean
          voice_enabled: boolean
          voice_id: string | null
          retell_agent_id: string | null
          phone_number: string | null
          phone_number_sid: string | null
          voice_language: string
          voice_speed: number
          voice_welcome_message: string
          voice_provider: 'retell'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          vertical?: 'general' | 'home_services' | 'dental' | 'medical' | 'legal' | 'real_estate' | 'restaurant' | 'ecommerce'
          website_url?: string | null
          system_prompt?: string | null
          welcome_message?: string
          fallback_message?: string
          widget_color?: string
          widget_position?: 'bottom-right' | 'bottom-left'
          widget_title?: string
          widget_subtitle?: string | null
          lead_capture_enabled?: boolean
          lead_capture_fields?: Json
          lead_capture_message?: string
          is_active?: boolean
          is_trained?: boolean
          voice_enabled?: boolean
          voice_id?: string | null
          retell_agent_id?: string | null
          phone_number?: string | null
          phone_number_sid?: string | null
          voice_language?: string
          voice_speed?: number
          voice_welcome_message?: string
          voice_provider?: 'retell'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          vertical?: 'general' | 'home_services' | 'dental' | 'medical' | 'legal' | 'real_estate' | 'restaurant' | 'ecommerce'
          website_url?: string | null
          system_prompt?: string | null
          welcome_message?: string
          fallback_message?: string
          widget_color?: string
          widget_position?: 'bottom-right' | 'bottom-left'
          widget_title?: string
          widget_subtitle?: string | null
          lead_capture_enabled?: boolean
          lead_capture_fields?: Json
          lead_capture_message?: string
          is_active?: boolean
          is_trained?: boolean
          voice_enabled?: boolean
          voice_id?: string | null
          retell_agent_id?: string | null
          phone_number?: string | null
          phone_number_sid?: string | null
          voice_language?: string
          voice_speed?: number
          voice_welcome_message?: string
          voice_provider?: 'retell'
          created_at?: string
          updated_at?: string
        }
      }
      training_sources: {
        Row: {
          id: string
          agent_id: string
          url: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          pages_found: number
          pages_scraped: number
          error_message: string | null
          last_scraped_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          url: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          pages_found?: number
          pages_scraped?: number
          error_message?: string | null
          last_scraped_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          url?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          pages_found?: number
          pages_scraped?: number
          error_message?: string | null
          last_scraped_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      document_chunks: {
        Row: {
          id: string
          agent_id: string
          training_source_id: string | null
          content: string
          metadata: Json
          embedding: number[] | null
          token_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          training_source_id?: string | null
          content: string
          metadata?: Json
          embedding?: number[] | null
          token_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          training_source_id?: string | null
          content?: string
          metadata?: Json
          embedding?: number[] | null
          token_count?: number | null
          created_at?: string
        }
      }
      faqs: {
        Row: {
          id: string
          agent_id: string
          question: string
          answer: string
          embedding: number[] | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          question: string
          answer: string
          embedding?: number[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          question?: string
          answer?: string
          embedding?: number[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          agent_id: string
          visitor_id: string
          lead_id: string | null
          status: 'active' | 'closed' | 'archived'
          metadata: Json
          started_at: string
          ended_at: string | null
          channel: 'chat' | 'voice' | 'sms'
          call_id: string | null
          call_status: 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer' | null
          call_duration: number | null
          call_recording_url: string | null
          call_from: string | null
          call_to: string | null
          call_transcript: string | null
          satisfaction_rating: number | null
          escalated: boolean
          escalation_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          visitor_id: string
          lead_id?: string | null
          status?: 'active' | 'closed' | 'archived'
          metadata?: Json
          started_at?: string
          ended_at?: string | null
          channel?: 'chat' | 'voice' | 'sms'
          call_id?: string | null
          call_status?: 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer' | null
          call_duration?: number | null
          call_recording_url?: string | null
          call_from?: string | null
          call_to?: string | null
          call_transcript?: string | null
          satisfaction_rating?: number | null
          escalated?: boolean
          escalation_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          visitor_id?: string
          lead_id?: string | null
          status?: 'active' | 'closed' | 'archived'
          metadata?: Json
          started_at?: string
          ended_at?: string | null
          channel?: 'chat' | 'voice' | 'sms'
          call_id?: string | null
          call_status?: 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer' | null
          call_duration?: number | null
          call_recording_url?: string | null
          call_from?: string | null
          call_to?: string | null
          call_transcript?: string | null
          satisfaction_rating?: number | null
          escalated?: boolean
          escalation_reason?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: Json
          sources_used: Json | null
          confidence: number | null
          latency_ms: number | null
          tokens_used: number | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Json
          sources_used?: Json | null
          confidence?: number | null
          latency_ms?: number | null
          tokens_used?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: Json
          sources_used?: Json | null
          confidence?: number | null
          latency_ms?: number | null
          tokens_used?: number | null
          created_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          agent_id: string
          conversation_id: string | null
          name: string | null
          email: string | null
          phone: string | null
          company: string | null
          custom_fields: Json
          status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          conversation_id?: string | null
          name?: string | null
          email?: string | null
          phone?: string | null
          company?: string | null
          custom_fields?: Json
          status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          conversation_id?: string | null
          name?: string | null
          email?: string | null
          phone?: string | null
          company?: string | null
          custom_fields?: Json
          status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quick_prompts: {
        Row: {
          id: string
          agent_id: string
          text: string
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          text: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          text?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          agent_id: string
          event_type: string
          visitor_id: string | null
          conversation_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          event_type: string
          visitor_id?: string | null
          conversation_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          event_type?: string
          visitor_id?: string | null
          conversation_id?: string | null
          metadata?: Json
          created_at?: string
        }
      }
    }
    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[]
          p_agent_id: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          content: string
          metadata: Json
          similarity: number
        }[]
      }
      match_faqs: {
        Args: {
          query_embedding: number[]
          p_agent_id: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          question: string
          answer: string
          similarity: number
        }[]
      }
    }
  }
}

// Helper types
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Agent = Database['public']['Tables']['agents']['Row']
export type AgentInsert = Database['public']['Tables']['agents']['Insert']
export type AgentUpdate = Database['public']['Tables']['agents']['Update']
export type TrainingSource = Database['public']['Tables']['training_sources']['Row']
export type DocumentChunk = Database['public']['Tables']['document_chunks']['Row']
export type FAQ = Database['public']['Tables']['faqs']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type Lead = Database['public']['Tables']['leads']['Row']
export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type QuickPrompt = Database['public']['Tables']['quick_prompts']['Row']
export type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row']

export type Vertical = Agent['vertical']
export type Channel = Conversation['channel']
export type CallStatus = NonNullable<Conversation['call_status']>
