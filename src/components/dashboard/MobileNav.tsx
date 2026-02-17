"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Bot,
  MessageSquare,
  Users,
  CreditCard,
  Settings,
  Menu,
  Phone,
  BarChart3,
} from "lucide-react"

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

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="h-14 flex flex-row items-center gap-2.5 px-5 border-b border-border/60">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">H</span>
          </div>
          <SheetTitle className="font-semibold heading text-[15px]">
            HeyAgent
          </SheetTitle>
        </SheetHeader>
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
                      onClick={() => setOpen(false)}
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
      </SheetContent>
    </Sheet>
  )
}
