"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const PLANS = {
  free: {
    name: "Free",
    price: 0,
    chatCredits: 100,
    agents: 1,
    features: ["1 AI Agent", "100 chat messages/month", "Basic analytics"],
  },
  starter: {
    name: "Starter",
    price: 29,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
    chatCredits: 1000,
    agents: 3,
    features: [
      "3 AI Agents",
      "1,000 chat messages/month",
      "Website training",
      "Lead capture",
      "Email support",
    ],
  },
  professional: {
    name: "Professional",
    price: 79,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
    chatCredits: 5000,
    agents: 10,
    features: [
      "10 AI Agents",
      "5,000 chat messages/month",
      "Advanced customization",
      "Priority support",
      "Analytics dashboard",
      "Integrations",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: null,
    chatCredits: -1,
    agents: -1,
    features: [
      "Unlimited agents",
      "Unlimited messages",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "Custom training",
    ],
  },
}

type PlanKey = keyof typeof PLANS

interface Organization {
  plan: PlanKey
  subscription_status: string
  chat_credits_used: number
  chat_credits_limit: number
}

export default function BillingPage() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrganization() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const membershipResult = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single()

      const membership = membershipResult.data as { organization_id: string } | null
      if (!membership) return

      const { data: org } = await supabase
        .from("organizations")
        .select("plan, subscription_status, chat_credits_used, chat_credits_limit")
        .eq("id", membership.organization_id)
        .single()

      setOrganization(org as Organization | null)
      setLoading(false)
    }

    fetchOrganization()
  }, [])

  const handleUpgrade = async (plan: PlanKey) => {
    const planConfig = PLANS[plan] as { priceId?: string; name: string; price: number | null }
    if (!planConfig.priceId) {
      if (plan === "enterprise") {
        window.location.href = "mailto:sales@voicebot.ai?subject=Enterprise%20Plan%20Inquiry"
      }
      return
    }

    setUpgrading(plan)

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: planConfig.priceId,
          plan,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || "Failed to create checkout")
      }
    } catch (error) {
      toast.error("Failed to start checkout")
    } finally {
      setUpgrading(null)
    }
  }

  const currentPlan = organization?.plan || "free"
  const usagePercentage = organization
    ? (organization.chat_credits_used / organization.chat_credits_limit) * 100
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold heading">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and usage
        </p>
      </div>

      {/* Current Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Current Usage</CardTitle>
          <CardDescription>
            Your chat message usage this billing period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Messages used</span>
            <span className="font-medium">
              {organization?.chat_credits_used || 0} /{" "}
              {organization?.chat_credits_limit || 100}
            </span>
          </div>
          <Progress value={usagePercentage} />
          {usagePercentage > 80 && (
            <p className="text-sm text-warning">
              You&apos;re approaching your message limit. Consider upgrading.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold heading mb-4">Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(
            ([key, plan]) => {
              const isCurrent = currentPlan === key
              const isUpgrade =
                Object.keys(PLANS).indexOf(key) >
                Object.keys(PLANS).indexOf(currentPlan)

              return (
                <Card
                  key={key}
                  className={cn(
                    "relative",
                    isCurrent && "border-primary ring-1 ring-primary"
                  )}
                >
                  {isCurrent && (
                    <Badge className="absolute -top-2 left-4">
                      Current Plan
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>
                      {plan.price !== null ? (
                        <>
                          <span className="text-3xl font-bold text-foreground">
                            ${plan.price}
                          </span>
                          <span className="text-muted-foreground">/month</span>
                        </>
                      ) : (
                        <span className="text-lg font-medium text-foreground">
                          Custom pricing
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Check className="h-4 w-4 text-success" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || upgrading !== null}
                      onClick={() => handleUpgrade(key)}
                    >
                      {upgrading === key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCurrent ? (
                        "Current Plan"
                      ) : key === "enterprise" ? (
                        "Contact Sales"
                      ) : isUpgrade ? (
                        "Upgrade"
                      ) : (
                        "Downgrade"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )
            }
          )}
        </div>
      </div>
    </div>
  )
}
