"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TrainingSource } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Globe, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"

interface AgentTrainingProps {
  agentId: string
  trainingSources: TrainingSource[]
}

export function AgentTraining({ agentId, trainingSources }: AgentTrainingProps) {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAddSource = async () => {
    if (!url.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, url: url.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to scrape")
      }

      toast.success("Website scraped successfully")
      setUrl("")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to scrape website")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>
      case "processing":
        return <Badge variant="default">Processing</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Training Source</CardTitle>
          <CardDescription>
            Train your agent on website content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="pl-10"
                disabled={loading}
              />
            </div>
            <Button onClick={handleAddSource} disabled={loading || !url.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Scan Website"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            We&apos;ll crawl up to 20 pages from this website and train your agent
            on the content
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Training Sources</CardTitle>
          <CardDescription>
            Websites your agent has been trained on
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trainingSources.length > 0 ? (
            <div className="space-y-3">
              {trainingSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {source.url}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {source.pages_scraped} pages •{" "}
                        {source.last_scraped_at
                          ? formatRelativeTime(source.last_scraped_at)
                          : "Not scraped yet"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(source.status)}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No training sources yet</p>
              <p className="text-sm">Add a website to train your agent</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
