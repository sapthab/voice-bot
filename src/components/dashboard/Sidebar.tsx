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
  Phone,
  BarChart3,
  Building2,
  CircleUser,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

const navSections = [
  {
    label: "BUILD",
    items: [
      { name: "Agents", href: "/agents", icon: Bot },
    ],
  },
  {
    label: "DEPLOY",
    items: [
      { name: "Phone Numbers", href: "/conversations?channel=voice", icon: Phone },
    ],
  },
  {
    label: "MONITOR",
    items: [
      { name: "Conversations", href: "/conversations", icon: MessageSquare },
      { name: "Voice Calls", href: "/voice-calls", icon: Phone },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { name: "Leads", href: "/leads", icon: Users },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { name: "Billing", href: "/billing", icon: CreditCard },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
]

interface SidebarProps {
  orgName: string
  userEmail: string
}

export function Sidebar({ orgName, userEmail }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border/60 bg-background">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 px-5 border-b border-border/60">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">H</span>
        </div>
        <span className="font-semibold heading text-[15px]">HeyAgent</span>
      </div>

      {/* Workspace */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/60">
        <Building2 className="h-4 w-4 text-muted-foreground/70 shrink-0" />
        <span className="text-[13px] font-medium text-foreground/80 truncate">{orgName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section, idx) => (
          <div key={section.label} className={cn(idx > 0 && "mt-5")}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const href = item.href.split("?")[0]
                let active = false
                if (href === "/dashboard") {
                  active = pathname === "/dashboard"
                } else if (item.name === "Phone Numbers") {
                  active = false
                } else if (item.name === "Voice Calls") {
                  active = pathname.startsWith("/voice-calls")
                } else {
                  active = pathname.startsWith(href)
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-150",
                      active
                        ? "bg-primary/8 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-border/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <CircleUser className="h-5 w-5 text-muted-foreground/60 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-foreground/70 truncate">{userEmail}</p>
          </div>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 font-medium">
            Free
          </Badge>
        </div>
      </div>
    </aside>
  )
}
