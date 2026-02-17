import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Bot, PlusCircle, MoreHorizontal, ExternalLink, Phone, Mic } from "lucide-react"
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold heading">All Agents</h1>
        <Link href="/agents/new">
          <Button size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create an Agent
          </Button>
        </Link>
      </div>

      {agents.length > 0 ? (
        <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Agent Name</TableHead>
                <TableHead>Vertical</TableHead>
                <TableHead>Voice</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="pl-4">
                    <Link
                      href={`/agents/${agent.id}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      <div
                        className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${agent.widget_color}20` }}
                      >
                        <Bot
                          className="h-4 w-4"
                          style={{ color: agent.widget_color }}
                        />
                      </div>
                      <span className="font-medium">{agent.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal capitalize">
                      {agent.vertical.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {agent.voice_enabled ? (
                      <Mic className="h-4 w-4 text-primary" />
                    ) : (
                      <span className="text-muted-foreground text-sm">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {agent.phone_number ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {agent.phone_number}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.is_active ? "success" : "secondary"}>
                      {agent.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatRelativeTime(agent.created_at)}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-3 heading">No agents yet</h3>
            <p className="text-[15px] text-muted-foreground text-center mb-5 leading-relaxed">
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
