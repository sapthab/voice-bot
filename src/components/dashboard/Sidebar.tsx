"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Bot,
  MessageSquare,
  Users,
  CreditCard,
  Settings,
  Home,
  PlusCircle,
  Phone,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "Voice Calls", href: "/conversations?channel=voice", icon: Phone },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r bg-card">
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">V</span>
        </div>
        <span className="font-semibold heading text-lg">VoiceBot AI</span>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t">
        <Link href="/agents/new">
          <Button className="w-full" size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Agent
          </Button>
        </Link>
      </div>
    </aside>
  )
}
