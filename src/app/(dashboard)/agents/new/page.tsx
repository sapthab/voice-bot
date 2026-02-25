"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { allVerticals, getTemplate, VerticalTemplate } from "@/templates"
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
  Upload,
  X,
  FileText,
  AlertCircle,
  Mic,
  Languages,
  Sparkles,
  MessageSquare,
  Users,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SUPPORTED_LANGUAGES, isIndianLanguage } from "@/lib/constants/languages"
import {
  getVoicesForLanguage,
  getDefaultVoiceForLanguage,
  hasNativeVoice,
} from "@/lib/constants/voices"

type Step = "vertical" | "configure" | "training" | "preview" | "embed"

interface UploadFile {
  file: File
  name: string
  size: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function NewAgentPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("vertical")
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [selectedVertical, setSelectedVertical] = useState<Vertical | null>(null)
  const [agentName, setAgentName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [agentId, setAgentId] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState("en-US")
  const [selectedVoiceId, setSelectedVoiceId] = useState("11labs-Adrian")
  const [voiceSpeed, setVoiceSpeed] = useState(1.0)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<"retell" | "bolna">("retell")

  const steps: { key: Step; label: string }[] = [
    { key: "vertical", label: "Industry" },
    { key: "configure", label: "Configure" },
    { key: "training", label: "Training" },
    { key: "preview", label: "Preview" },
    { key: "embed", label: "Go Live" },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === step)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const selectedTemplate: VerticalTemplate | null = selectedVertical
    ? getTemplate(selectedVertical)
    : null

  const handleSelectVertical = (vertical: Vertical) => {
    setSelectedVertical(vertical)
    const template = getTemplate(vertical)
    if (!agentName) {
      setAgentName(`My ${template.name} Agent`)
    }
    // Pre-fill voice from template default
    setSelectedVoiceId(template.defaultVoice.voiceId)
  }

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang)
    // Auto-switch provider based on language
    const newProvider = isIndianLanguage(lang) ? "bolna" : "retell"
    setSelectedProvider(newProvider)
    const defaultVoice = getDefaultVoiceForLanguage(lang, newProvider)
    setSelectedVoiceId(defaultVoice.id)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles: UploadFile[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`)
        continue
      }
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (!["pdf", "docx", "txt"].includes(ext || "")) {
        toast.error(`${file.name} is not a supported file type (PDF, DOCX, TXT)`)
        continue
      }
      newFiles.push({
        file,
        name: file.name,
        size: formatFileSize(file.size),
      })
    }
    setUploadFiles((prev) => [...prev, ...newFiles])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleContinue = async () => {
    if (step === "vertical" && selectedVertical) {
      setStep("configure")
    } else if (step === "configure") {
      setStep("training")
    } else if (step === "training") {
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
          language: selectedLanguage,
          voiceId: selectedVoiceId,
          voiceSpeed,
          voiceLanguage: selectedLanguage,
          voiceProvider: selectedProvider,
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

      // Upload files in parallel (max 3)
      if (uploadFiles.length > 0) {
        setUploadingFiles(true)
        const uploadPromises = uploadFiles.map((uf) => {
          const formData = new FormData()
          formData.append("file", uf.file)
          return fetch(`/api/agents/${agent.id}/upload`, {
            method: "POST",
            body: formData,
          })
        })
        await Promise.allSettled(uploadPromises)
        setUploadingFiles(false)
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
    if (step === "configure") setStep("vertical")
    else if (step === "training") setStep("configure")
    else if (step === "preview") setStep("training")
    else if (step === "embed") setStep("preview")
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const embedCode = agentId
    ? `<script src="${appUrl}/widget.js" data-agent-id="${agentId}"></script>`
    : ""

  const widgetUrl = agentId ? `${appUrl}/widget/${agentId}` : ""

  const filteredVoices = getVoicesForLanguage(selectedLanguage, selectedProvider)
  const showNoNativeVoiceWarning = !hasNativeVoice(selectedLanguage, selectedProvider)

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

      {/* Step 1: Industry */}
      {step === "vertical" && (
        <Card>
          <CardHeader>
            <CardTitle className="heading">What industry are you in?</CardTitle>
            <CardDescription>
              We&apos;ll customize your AI with industry-specific knowledge
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {/* Industry summary panel */}
            {selectedTemplate && (
              <div className="mt-4 p-4 rounded-lg border bg-muted/30 space-y-3">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  What&apos;s included with {selectedTemplate.name}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Industry-tuned AI prompt</p>
                      <p className="text-muted-foreground text-xs">
                        {selectedTemplate.configSummary.promptFocus}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">
                        {selectedTemplate.defaultFaqs.length} pre-built FAQs
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Common questions auto-answered
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">
                        {selectedTemplate.leadCaptureFields.length} lead capture fields
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {selectedTemplate.leadCaptureFields.join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">
                        {selectedTemplate.escalationTriggers.length} escalation triggers
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Auto-escalates to humans when needed
                      </p>
                    </div>
                  </div>
                </div>
                {selectedTemplate.configSummary.specialCapabilities.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Special capabilities
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTemplate.configSummary.specialCapabilities.map(
                        (cap) => (
                          <span
                            key={cap}
                            className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                          >
                            {cap}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configure */}
      {step === "configure" && (
        <Card>
          <CardHeader>
            <CardTitle className="heading">Configure your agent</CardTitle>
            <CardDescription>
              Set up name, language, and voice for your AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
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
              <Label className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Language
              </Label>
              <Select
                value={selectedLanguage}
                onValueChange={handleLanguageChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Your agent will respond in this language
              </p>
            </div>

            <div className="space-y-2">
              <Label>Voice Provider</Label>
              <Select
                value={selectedProvider}
                onValueChange={(value) => {
                  const prov = value as "retell" | "bolna"
                  setSelectedProvider(prov)
                  const defaultVoice = getDefaultVoiceForLanguage(selectedLanguage, prov)
                  setSelectedVoiceId(defaultVoice.id)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retell">
                    Retell (US/EU)
                  </SelectItem>
                  <SelectItem value="bolna">
                    Bolna (India)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedProvider === "bolna"
                  ? "Optimized for Indian languages with local telephony"
                  : "Best for US/EU with ElevenLabs voices"}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Voice
              </Label>
              <Select
                value={selectedVoiceId}
                onValueChange={setSelectedVoiceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {filteredVoices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name} ({voice.gender === "male" ? "M" : "F"},{" "}
                      {voice.accent}) - {voice.persona}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showNoNativeVoiceWarning && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  No native voice for this language. Using English voices as fallback.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Voice Speed: {voiceSpeed.toFixed(1)}x
              </Label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Slow (0.5x)</span>
                <span>Normal (1.0x)</span>
                <span>Fast (2.0x)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Training */}
      {step === "training" && (
        <Card>
          <CardHeader>
            <CardTitle className="heading">Train your agent</CardTitle>
            <CardDescription>
              Add your website and documents so your AI can learn about your
              business. Both are optional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
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
                We&apos;ll automatically scan and train your agent on your
                website content
              </p>
            </div>

            <div className="space-y-2">
              <Label>Upload Documents (optional)</Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50",
                  uploadFiles.length > 0 && "border-primary/30"
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const dt = e.dataTransfer
                  if (dt.files) {
                    const input = fileInputRef.current
                    if (input) {
                      const dataTransfer = new DataTransfer()
                      for (let i = 0; i < dt.files.length; i++) {
                        dataTransfer.items.add(dt.files[i])
                      }
                      input.files = dataTransfer.files
                      input.dispatchEvent(new Event("change", { bubbles: true }))
                    }
                  }
                }}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  Drop files here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, or TXT (max 10MB each)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />

              {uploadFiles.length > 0 && (
                <div className="space-y-2 mt-3">
                  {uploadFiles.map((uf, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{uf.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {uf.size}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Preview */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="heading flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Your Agent is Ready!
            </CardTitle>
            <CardDescription>
              {scraping || uploadingFiles
                ? "We're training your agent..."
                : "Test your agent before going live"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scraping || uploadingFiles ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">
                  {scraping
                    ? "Scanning website and training AI..."
                    : "Uploading documents..."}
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

      {/* Step 5: Go Live */}
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
              (step === "configure" && !agentName) ||
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
                {step === "training" ? "Create Agent" : step === "preview" ? "Continue" : "Next"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
