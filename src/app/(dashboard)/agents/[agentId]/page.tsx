import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Bot,
  Globe,
  ExternalLink,
  Copy,
  MessageSquare,
  Users,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { AgentSettings } from "@/components/dashboard/AgentSettings"
import { AgentTraining } from "@/components/dashboard/AgentTraining"
import { FAQEditor } from "@/components/dashboard/FAQEditor"
import { VoiceSettings } from "@/components/dashboard/VoiceSettings"
import { Agent, TrainingSource, FAQ } from "@/types/database"

interface AgentPageProps {
  params: Promise<{ agentId: string }>
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { agentId } = await params
  const supabase = await createClient()

  // Fetch agent
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .single()

  if (error || !data) {
    notFound()
  }

  const agent = data as Agent

  // Fetch stats
  const [conversationsResult, leadsResult, trainingSourcesResult, faqsResult] =
    await Promise.all([
      supabase
        .from("conversations")
        .select("id", { count: "exact" })
        .eq("agent_id", agentId),
      supabase
        .from("leads")
        .select("id", { count: "exact" })
        .eq("agent_id", agentId),
      supabase
        .from("training_sources")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false }),
      supabase
        .from("faqs")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false }),
    ])

  const trainingSources = (trainingSourcesResult.data || []) as TrainingSource[]
  const faqs = (faqsResult.data || []) as FAQ[]

  const stats = [
    {
      name: "Conversations",
      value: conversationsResult.count || 0,
      icon: MessageSquare,
    },
    {
      name: "Leads",
      value: leadsResult.count || 0,
      icon: Users,
    },
    {
      name: "Response Rate",
      value: "98%",
      icon: TrendingUp,
    },
  ]

  const embedCode = `<script src="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/widget.js" data-agent-id="${agentId}"></script>`
  const widgetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/widget/${agentId}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${agent.widget_color}20` }}
          >
            <Bot className="h-7 w-7" style={{ color: agent.widget_color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold heading">{agent.name}</h1>
              <Badge variant={agent.is_active ? "success" : "secondary"}>
                {agent.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="capitalize">
                {agent.vertical.replace("_", " ")}
              </span>
              {agent.website_url && (
                <>
                  <span>•</span>
                  <a
                    href={agent.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <Globe className="h-3 w-3" />
                    {new URL(agent.website_url).hostname}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={widgetUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Test Widget
            </Button>
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold heading">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="voice">Voice</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Embed Code */}
            <Card>
              <CardHeader>
                <CardTitle>Embed Code</CardTitle>
                <CardDescription>
                  Add this code to your website
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="p-3 rounded-lg bg-muted text-xs overflow-x-auto">
                    <code>{embedCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/conversations?agentId=${agentId}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    View Conversations
                  </Button>
                </Link>
                <Link href={`/leads?agentId=${agentId}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    View Leads
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="training">
          <AgentTraining
            agentId={agentId}
            trainingSources={trainingSources}
          />
        </TabsContent>

        <TabsContent value="faqs">
          <FAQEditor agentId={agentId} faqs={faqs} />
        </TabsContent>

        <TabsContent value="voice">
          <VoiceSettings agent={agent} />
        </TabsContent>

        <TabsContent value="settings">
          <AgentSettings agent={agent} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
