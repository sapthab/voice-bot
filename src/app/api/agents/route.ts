import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { AgentInsert } from "@/types/database"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      vertical,
      websiteUrl,
      systemPrompt,
      welcomeMessage,
      fallbackMessage,
      leadCaptureMessage,
      leadCaptureFields,
      language,
      voiceId,
      voiceSpeed,
      voiceLanguage,
    } = body

    if (!name || !vertical) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get organization
    const adminSupabase = await createAdminClient()
    let membershipResult = await adminSupabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    let membership = membershipResult.data as { organization_id: string } | null

    // Auto-create organization if user doesn't have one
    if (!membership) {
      const companyName = user.user_metadata?.company_name ||
                         `${user.email?.split("@")[0]}'s Organization`

      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

      console.log("Creating organization for user:", user.id, "with name:", companyName)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: org, error: orgError } = await (adminSupabase.from("organizations") as any)
        .insert({
          name: companyName,
          slug: `${slug}-${Date.now().toString(36)}`,
          owner_id: user.id,
        })
        .select()
        .single()

      if (orgError || !org) {
        console.error("Error creating organization:", orgError)
        console.error("Organization error details:", JSON.stringify(orgError, null, 2))
        return NextResponse.json(
          { error: "Failed to create organization", details: orgError?.message },
          { status: 500 }
        )
      }

      console.log("Organization created:", org.id)

      // Add user as organization owner
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminSupabase.from("organization_members") as any).insert({
        organization_id: org.id,
        user_id: user.id,
        role: "owner",
      })

      // Update profile with default organization
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminSupabase.from("profiles") as any)
        .update({ default_organization_id: org.id })
        .eq("id", user.id)

      membership = { organization_id: org.id }
    }

    // Create agent
    const agentData: AgentInsert = {
      organization_id: membership.organization_id,
      name,
      vertical,
      website_url: websiteUrl || null,
      system_prompt: systemPrompt || null,
      welcome_message: welcomeMessage || "Hello! How can I help you today?",
      fallback_message: fallbackMessage || "I'm not sure I understand. Could you please rephrase that?",
      lead_capture_message: leadCaptureMessage || "Before we continue, could you share your contact info?",
      lead_capture_fields: leadCaptureFields || ["name", "email", "phone"],
      language: language || "en-US",
      ...(voiceId && { voice_id: voiceId }),
      ...(voiceSpeed !== undefined && { voice_speed: voiceSpeed }),
      ...(voiceLanguage && { voice_language: voiceLanguage }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agent, error } = await (adminSupabase.from("agents") as any)
      .insert(agentData)
      .select()
      .single()

    if (error) {
      console.error("Error creating agent:", error)
      return NextResponse.json(
        { error: "Failed to create agent" },
        { status: 500 }
      )
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error("Agents API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminSupabase = await createAdminClient()

    // Get organization
    const membershipResult = await adminSupabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    const membership = membershipResult.data as { organization_id: string } | null

    if (!membership) {
      return NextResponse.json({ agents: [] })
    }

    const agentsResult = await adminSupabase
      .from("agents")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false })

    return NextResponse.json({ agents: agentsResult.data || [] })
  } catch (error) {
    console.error("Agents GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
