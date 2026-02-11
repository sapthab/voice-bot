import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bot, PlusCircle, MoreHorizontal, ExternalLink } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatRelativeTime } from "@/lib/utils"
import { Agent } from "@/types/database"

export default async function AgentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get organization
  const membershipResult = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single()

  const organizationId = (membershipResult.data as { organization_id: string } | null)?.organization_id

  const { data } = await supabase
    .from("agents")
    .select("*")
    .eq("organization_id", organizationId || "")
    .order("created_at", { ascending: false })

  const agents = (data || []) as Agent[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold heading">Agents</h1>
          <p className="text-muted-foreground">
            Manage your AI chat agents
          </p>
        </div>
        <Link href="/agents/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Agent
          </Button>
        </Link>
      </div>

      {agents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${agent.widget_color}20` }}
                  >
                    <Bot
                      className="h-5 w-5"
                      style={{ color: agent.widget_color }}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {agent.vertical.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/agents/${agent.id}`}>View Details</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href={`/widget/${agent.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Test Widget
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant={agent.is_active ? "success" : "secondary"}>
                      {agent.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {agent.is_trained && (
                      <Badge variant="outline">Trained</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(agent.created_at)}
                  </span>
                </div>
                <Link
                  href={`/agents/${agent.id}`}
                  className="mt-4 block"
                >
                  <Button variant="outline" className="w-full" size="sm">
                    Manage Agent
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No agents yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first AI receptionist to start handling customer
              inquiries
            </p>
            <Link href="/agents/new">
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Agent
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
