"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { allVerticals, getTemplate } from "@/templates"
import { Vertical } from "@/types/database"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Bot,
  Loader2,
  Copy,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Step = "vertical" | "website" | "preview" | "embed"

export default function NewAgentPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("vertical")
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)

  // Form state
  const [selectedVertical, setSelectedVertical] = useState<Vertical | null>(null)
  const [agentName, setAgentName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [agentId, setAgentId] = useState<string | null>(null)

  const steps: { key: Step; label: string }[] = [
    { key: "vertical", label: "Industry" },
    { key: "website", label: "Website" },
    { key: "preview", label: "Preview" },
    { key: "embed", label: "Go Live" },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === step)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const handleSelectVertical = (vertical: Vertical) => {
    setSelectedVertical(vertical)
    const template = getTemplate(vertical)
    if (!agentName) {
      setAgentName(`My ${template.name} Agent`)
    }
  }

  const handleContinue = async () => {
    if (step === "vertical" && selectedVertical) {
      setStep("website")
    } else if (step === "website") {
      await createAgent()
    } else if (step === "preview") {
      setStep("embed")
    }
  }

  const createAgent = async () => {
    if (!selectedVertical) return

    setLoading(true)

    try {
      const template = getTemplate(selectedVertical)

      // Create agent via API
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
          vertical: selectedVertical,
          websiteUrl: websiteUrl || null,
          systemPrompt: template.systemPrompt,
          welcomeMessage: template.welcomeMessage,
          fallbackMessage: template.fallbackMessage,
          leadCaptureMessage: template.leadCaptureMessage,
          leadCaptureFields: template.leadCaptureFields,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create agent")
      }

      const { agent } = await response.json()
      setAgentId(agent.id)

      // Create default FAQs
      if (template.defaultFaqs.length > 0) {
        for (const faq of template.defaultFaqs) {
          await fetch(`/api/agents/${agent.id}/faqs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(faq),
          }).catch(console.error)
        }
      }

      // Create quick prompts
      if (template.quickPrompts.length > 0) {
        for (let i = 0; i < template.quickPrompts.length; i++) {
          await fetch(`/api/agents/${agent.id}/quick-prompts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: template.quickPrompts[i],
              sortOrder: i,
            }),
          }).catch(console.error)
        }
      }

      // Start scraping if URL provided
      if (websiteUrl) {
        setScraping(true)
        try {
          await fetch("/api/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agentId: agent.id,
              url: websiteUrl,
            }),
          })
        } catch (e) {
          console.error("Scraping error:", e)
        }
        setScraping(false)
      }

      setStep("preview")
      toast.success("Agent created successfully!")
    } catch (error) {
      console.error("Error creating agent:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create agent")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step === "website") setStep("vertical")
    else if (step === "preview") setStep("website")
    else if (step === "embed") setStep("preview")
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const embedCode = agentId
    ? `<script src="${appUrl}/widget.js" data-agent-id="${agentId}"></script>`
    : ""

  const widgetUrl = agentId ? `${appUrl}/widget/${agentId}` : ""

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold heading">Create New Agent</h1>
        <p className="text-muted-foreground">
          Set up your AI receptionist in just a few steps
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          {steps.map((s, i) => (
            <span
              key={s.key}
              className={cn(
                "text-muted-foreground",
                i <= currentStepIndex && "text-primary font-medium"
              )}
            >
              {s.label}
            </span>
          ))}
        </div>
        <Progress value={progress} />
      </div>

      {step === "vertical" && (
        <Card>
          <CardHeader>
            <CardTitle className="heading">What industry are you in?</CardTitle>
            <CardDescription>
              We&apos;ll customize your AI with industry-specific knowledge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allVerticals.map((template) => (
                <button
                  key={template.vertical}
                  onClick={() => handleSelectVertical(template.vertical)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:border-primary/50",
                    selectedVertical === template.vertical
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50"
                  )}
                >
                  <span className="text-2xl">{template.icon}</span>
                  <span className="font-medium text-sm">{template.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "website" && (
        <Card>
          <CardHeader>
            <CardTitle className="heading">Train on your website</CardTitle>
            <CardDescription>
              We&apos;ll scan your website to learn about your business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Name</Label>
              <Input
                id="agentName"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g., Sarah - Customer Support"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL (optional)</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="websiteUrl"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your website URL and we&apos;ll automatically train your
                agent on its content
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="heading flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Your Agent is Ready!
            </CardTitle>
            <CardDescription>
              {scraping
                ? "We're training your agent on your website content..."
                : "Test your agent before going live"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scraping ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">
                  Scanning website and training AI...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{agentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedVertical && getTemplate(selectedVertical).name}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-background">
                    <p className="text-sm">
                      {selectedVertical &&
                        getTemplate(selectedVertical).welcomeMessage}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      window.open(widgetUrl, "_blank", "width=400,height=600")
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Test Chat Widget
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "embed" && (
        <Card>
          <CardHeader>
            <CardTitle className="heading flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              Go Live
            </CardTitle>
            <CardDescription>
              Add this code to your website to embed the chat widget
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Embed Code</Label>
              <div className="relative">
                <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto">
                  <code>{embedCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    navigator.clipboard.writeText(embedCode)
                    toast.success("Copied to clipboard!")
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste this code just before the closing &lt;/body&gt; tag on
                your website
              </p>
            </div>

            <div className="space-y-2">
              <Label>Or use the direct link</Label>
              <div className="flex gap-2">
                <Input value={widgetUrl} readOnly />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(widgetUrl)
                    toast.success("Copied to clipboard!")
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="pt-4">
              <Button
                className="w-full"
                onClick={() => router.push(`/agents/${agentId}`)}
              >
                Go to Agent Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        {step !== "vertical" ? (
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        ) : (
          <div />
        )}
        {step !== "embed" && (
          <Button
            onClick={handleContinue}
            disabled={
              (step === "vertical" && !selectedVertical) ||
              (step === "website" && !agentName) ||
              loading ||
              scraping
            }
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                {step === "preview" ? "Continue" : "Next"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
