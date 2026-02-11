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
  Home,
  Menu,
  PlusCircle,
  Phone,
} from "lucide-react"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "Voice Calls", href: "/conversations?channel=voice", icon: Phone },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
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
        <SheetHeader className="h-16 flex flex-row items-center gap-2 px-6 border-b">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">V</span>
          </div>
          <SheetTitle className="font-semibold heading text-lg">
            VoiceBot AI
          </SheetTitle>
        </SheetHeader>
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
                onClick={() => setOpen(false)}
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
          <Link href="/agents/new" onClick={() => setOpen(false)}>
            <Button className="w-full" size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Agent
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
