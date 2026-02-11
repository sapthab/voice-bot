import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Users, MoreHorizontal, Mail, Phone } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import Link from "next/link"

const statusColors: Record<string, "default" | "secondary" | "success" | "destructive"> = {
  new: "default",
  contacted: "secondary",
  qualified: "success",
  converted: "success",
  lost: "destructive",
}

interface AgentInfo {
  id: string
  name: string
}

interface LeadWithAgent {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  status: string
  created_at: string
  agents: AgentInfo | null
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string }>
}) {
  const { agentId } = await searchParams
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

  const membership = membershipResult.data as { organization_id: string } | null

  // Get agents for this organization
  const agentsResult = await supabase
    .from("agents")
    .select("id, name")
    .eq("organization_id", membership?.organization_id || "")

  const agents = (agentsResult.data || []) as { id: string; name: string }[]
  const agentIds = agents.map((a) => a.id)

  // Build query for leads
  let query = supabase
    .from("leads")
    .select(
      `
      *,
      agents(id, name)
    `
    )
    .in("agent_id", agentIds.length > 0 ? agentIds : [""])
    .order("created_at", { ascending: false })
    .limit(100)

  if (agentId) {
    query = query.eq("agent_id", agentId)
  }

  const { data } = await query
  const leads = (data || []) as LeadWithAgent[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold heading">Leads</h1>
        <p className="text-muted-foreground">
          Manage contacts captured from conversations
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Link href="/leads">
          <Badge
            variant={!agentId ? "default" : "outline"}
            className="cursor-pointer"
          >
            All Agents
          </Badge>
        </Link>
        {agents.map((agent) => (
          <Link key={agent.id} href={`/leads?agentId=${agent.id}`}>
            <Badge
              variant={agentId === agent.id ? "default" : "outline"}
              className="cursor-pointer"
            >
              {agent.name}
            </Badge>
          </Link>
        ))}
      </div>

      {leads.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Captured</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    {lead.name || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {lead.email && (
                        <span className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                      )}
                      {lead.phone && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lead.agents?.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[lead.status] || "secondary"}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(lead.created_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Mark as Contacted</DropdownMenuItem>
                        <DropdownMenuItem>Mark as Qualified</DropdownMenuItem>
                        <DropdownMenuItem>Mark as Converted</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No leads yet</h3>
            <p className="text-muted-foreground text-center">
              Leads will appear here when visitors share their contact information
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
