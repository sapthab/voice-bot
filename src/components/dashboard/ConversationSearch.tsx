"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, MessageSquare } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"

interface SearchResult {
  conversationId: string
  matchedContent: string
  matchedRole: string
  conversation: {
    id: string
    visitor_id: string
    channel: string
    created_at: string
    agents: { id: string; name: string; widget_color: string } | null
    leads: { id: string; name: string | null; email: string | null } | null
  }
}

export function ConversationSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (value: string) => {
    setQuery(value)

    if (value.length < 2) {
      setResults([])
      setHasSearched(false)
      return
    }

    setSearching(true)
    try {
      const response = await fetch(
        `/api/conversations/search?q=${encodeURIComponent(value)}`
      )
      if (response.ok) {
        const data = await response.json()
        setResults(data.conversations || [])
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setSearching(false)
      setHasSearched(true)
    }
  }

  // Debounce search
  let timeout: NodeJS.Timeout
  const debouncedSearch = (value: string) => {
    setQuery(value)
    clearTimeout(timeout)
    timeout = setTimeout(() => handleSearch(value), 300)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={query}
          onChange={(e) => debouncedSearch(e.target.value)}
          className="pl-9"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {hasSearched && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </p>
          {results.map((result) => (
            <Card key={result.conversationId} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {result.conversation.leads?.name ||
                          `Visitor ${result.conversation.visitor_id.slice(0, 8)}`}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {result.conversation.agents?.name || "Unknown"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {result.conversation.channel}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(result.conversation.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      <span className="font-medium">
                        {result.matchedRole === "assistant" ? "AI: " : "User: "}
                      </span>
                      {result.matchedContent}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {hasSearched && query.length >= 2 && results.length === 0 && !searching && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No conversations found for &quot;{query}&quot;
        </p>
      )}
    </div>
  )
}
