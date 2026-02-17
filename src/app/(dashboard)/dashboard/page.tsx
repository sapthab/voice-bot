import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, MessageSquare, Users, TrendingUp, PlusCircle } from "lucide-react"
import Link from "next/link"
import { Agent } from "@/types/database"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get organization for current user
  const membershipResult = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single()

  const membership = membershipResult.data as { organization_id: string } | null
  const organizationId = membership?.organization_id

  // Fetch agents first
  const agentsResult = await supabase
    .from("agents")
    .select("*")
    .eq("organization_id", organizationId || "")
    .order("created_at", { ascending: false })
    .limit(5)

  const agents = (agentsResult.data || []) as Agent[]
  const agentIds = agents.map((a) => a.id)

  // Fetch stats
  const [conversationsResult, leadsResult] = await Promise.all([
    supabase
      .from("conversations")
      .select("id", { count: "exact" })
      .in("agent_id", agentIds.length > 0 ? agentIds : [""]),
    supabase
      .from("leads")
      .select("id", { count: "exact" })
      .in("agent_id", agentIds.length > 0 ? agentIds : [""]),
  ])

  const stats = [
    {
      name: "Active Agents",
      value: agents.length,
      icon: Bot,
      href: "/agents",
    },
    {
      name: "Conversations",
      value: conversationsResult.count || 0,
      icon: MessageSquare,
      href: "/conversations",
    },
    {
      name: "Leads Captured",
      value: leadsResult.count || 0,
      icon: Users,
      href: "/leads",
    },
    {
      name: "Response Rate",
      value: "98%",
      icon: TrendingUp,
      href: "/agents",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold heading">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your AI receptionists
          </p>
        </div>
        <Link href="/agents/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Agent
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="heading">Recent Agents</CardTitle>
        </CardHeader>
        <CardContent>
          {agents.length > 0 ? (
            <div className="space-y-4">
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {agent.vertical.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-xs ${
                      agent.is_active
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {agent.is_active ? "Active" : "Inactive"}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No agents yet</p>
              <Link href="/agents/new">
                <Button variant="outline">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create your first agent
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
