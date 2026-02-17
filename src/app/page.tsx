import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { VoiceWaveform } from "@/components/marketing/VoiceWaveform"
import {
  ArrowRight,
  Phone,
  MessageSquare,
  Globe,
  Zap,
  Shield,
  Users,
  BarChart3,
  CalendarCheck,
  Mic,
  ArrowUpRight,
} from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-[1120px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
                <span className="text-white font-bold text-xs">H</span>
              </div>
              <span className="font-semibold text-sm tracking-tight">HeyAgent</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              {["Products", "Features", "Use Cases", "Pricing"].map((item) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase().replace(" ", "-")}`}
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm" className="h-8 px-4 text-[13px] rounded-lg">
                Get started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="pt-32 pb-20 md:pt-40 md:pb-28">
          <div className="max-w-[1120px] mx-auto px-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 mb-8">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-subtle" />
                <span className="text-[11px] font-medium text-muted-foreground">Now supporting 32 languages</span>
              </div>

              <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] display leading-[1.05] tracking-tight mb-6">
                AI agents that talk
                <br />
                like humans do
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mb-10">
                Deploy voice and chat agents that handle customer calls, capture leads,
                and book appointments. Available 24/7, in any language.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-5">
                <Link href="/signup">
                  <Button size="lg" className="h-11 px-6 text-sm font-medium rounded-lg">
                    Start for free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#products">
                  <Button size="lg" variant="outline" className="h-11 px-6 text-sm font-medium rounded-lg">
                    See how it works
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground/60">No credit card required</p>
            </div>
          </div>
        </section>

        {/* ── Demo ── */}
        <section className="pb-24 md:pb-32">
          <div className="max-w-[1120px] mx-auto px-6">
            <div className="max-w-lg mx-auto">
              <VoiceWaveform />
            </div>
          </div>
        </section>

        {/* ── Logos ── */}
        <section className="py-12 border-y border-border/50">
          <div className="max-w-[1120px] mx-auto px-6">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground/40 text-center mb-6">
              Trusted by forward-thinking teams
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-3 opacity-20">
              {["Lenovo", "Capsule", "SmartEnergy", "Opendoor", "Anker", "DoorDash"].map((name) => (
                <span key={name} className="text-sm font-semibold tracking-wide whitespace-nowrap">{name}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Statement ── */}
        <section className="py-28 md:py-40">
          <div className="max-w-[880px] mx-auto px-6 text-center">
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] display leading-[1.15] text-foreground/90">
              Every missed call is a missed opportunity. Every slow reply
              costs you a customer. HeyAgent makes sure neither happens.
            </h2>
          </div>
        </section>

        {/* ── Products ── */}
        <section id="products" className="pb-28 md:pb-40">
          <div className="max-w-[1120px] mx-auto px-6">
            <div className="mb-16">
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground mb-3">Products</p>
              <h2 className="text-3xl md:text-4xl display leading-tight">
                Two channels. One platform.
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Voice Agents */}
              <div className="group rounded-xl border border-border bg-white p-8 md:p-10 hover:border-foreground/15 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-foreground/[0.04] flex items-center justify-center mb-6">
                  <Phone className="h-5 w-5 text-foreground/60" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight mb-3">Voice Agents</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  AI agents that pick up the phone, hold natural conversations, qualify leads,
                  and schedule appointments — with sub-300ms latency and natural turn-taking.
                </p>
                <ul className="space-y-2.5 mb-8">
                  {[
                    "Sub-300ms response latency",
                    "Natural interruption handling",
                    "32 languages with native accents",
                    "Call recording & transcription",
                    "Warm transfer to humans",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                      <span className="h-1 w-1 rounded-full bg-foreground/25 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="inline-flex items-center gap-1.5 text-[13px] font-medium hover:underline underline-offset-4">
                  Get started <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Chat Agents */}
              <div className="group rounded-xl border border-border bg-white p-8 md:p-10 hover:border-foreground/15 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-foreground/[0.04] flex items-center justify-center mb-6">
                  <MessageSquare className="h-5 w-5 text-foreground/60" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight mb-3">Chat Agents</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Intelligent chat widgets that engage every visitor, draw answers from your
                  knowledge base, capture leads, and hand off to your team when needed.
                </p>
                <ul className="space-y-2.5 mb-8">
                  {[
                    "Train on any URL, PDF, or FAQ",
                    "Fully branded widget",
                    "Intelligent lead capture",
                    "One-line embed on any site",
                    "Conversation analytics",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                      <span className="h-1 w-1 rounded-full bg-foreground/25 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="inline-flex items-center gap-1.5 text-[13px] font-medium hover:underline underline-offset-4">
                  Get started <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="py-28 md:py-40 bg-[#fafafa]">
          <div className="max-w-[1120px] mx-auto px-6">
            <div className="mb-16">
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground mb-3">How it works</p>
              <h2 className="text-3xl md:text-4xl display leading-tight">
                Live in under ten minutes
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-12 md:gap-16">
              {[
                {
                  step: "01",
                  title: "Feed it your knowledge",
                  description:
                    "Paste your website URL and HeyAgent crawls every page — learning your services, pricing, FAQs, and brand voice. Upload PDFs or type custom Q&A for anything else.",
                  icon: Globe,
                },
                {
                  step: "02",
                  title: "Shape its personality",
                  description:
                    "Choose a voice, set the tone, configure business hours, set up lead capture, and establish escalation rules. Full control, no code required.",
                  icon: Mic,
                },
                {
                  step: "03",
                  title: "Go live everywhere",
                  description:
                    "Embed the chat widget with one line of code. Provision a phone number. Connect your CRM and calendar. Your agent works across every channel.",
                  icon: Zap,
                },
              ].map((item) => (
                <div key={item.step}>
                  <span className="text-[64px] font-bold tracking-tighter text-foreground/[0.04] leading-none block mb-6">
                    {item.step}
                  </span>
                  <div className="h-10 w-10 rounded-lg bg-white border border-border flex items-center justify-center mb-5">
                    <item.icon className="h-5 w-5 text-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-28 md:py-40">
          <div className="max-w-[1120px] mx-auto px-6">
            <div className="mb-16">
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground mb-3">Features</p>
              <h2 className="text-3xl md:text-4xl display leading-tight max-w-lg">
                Everything you need to scale conversations
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {[
                {
                  icon: Zap,
                  title: "Sub-second latency",
                  description: "Under 300ms response time. Conversations feel natural with no awkward pauses or robotic delays.",
                },
                {
                  icon: Shield,
                  title: "Knowledge grounding",
                  description: "Every answer comes from your approved content. When the agent doesn't know, it says so and escalates.",
                },
                {
                  icon: Globe,
                  title: "32 languages",
                  description: "Serve customers in their native language with culturally-aware responses and native-quality accents.",
                },
                {
                  icon: CalendarCheck,
                  title: "Appointment booking",
                  description: "Connect to Google Calendar, check availability, book appointments, and send confirmations in real time.",
                },
                {
                  icon: Users,
                  title: "Lead capture",
                  description: "Collect contact details mid-conversation. Qualify leads against your criteria. Sync to your CRM automatically.",
                },
                {
                  icon: BarChart3,
                  title: "Analytics",
                  description: "Monitor call volume, resolution rates, sentiment trends, and knowledge gaps from a unified dashboard.",
                },
              ].map((feature) => (
                <div key={feature.title}>
                  <div className="h-10 w-10 rounded-lg bg-foreground/[0.04] flex items-center justify-center mb-4">
                    <feature.icon className="h-5 w-5 text-foreground/50" />
                  </div>
                  <h3 className="text-[15px] font-semibold tracking-tight mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="py-20 md:py-28 border-y border-border/50">
          <div className="max-w-[1120px] mx-auto px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 md:gap-16">
              {[
                { value: "10M+", label: "Conversations handled" },
                { value: "<300ms", label: "Average latency" },
                { value: "98.2%", label: "Customer satisfaction" },
                { value: "32", label: "Languages supported" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-4xl md:text-5xl font-bold tracking-tight mb-2">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Use Cases ── */}
        <section id="use-cases" className="py-28 md:py-40">
          <div className="max-w-[1120px] mx-auto px-6">
            <div className="mb-16">
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground mb-3">Use cases</p>
              <h2 className="text-3xl md:text-4xl display leading-tight max-w-lg">
                Built for the industries that need it most
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: "Healthcare",
                  items: ["Appointment scheduling", "Patient intake", "After-hours triage", "Prescription refills"],
                },
                {
                  title: "Home Services",
                  items: ["Emergency dispatch", "Service booking", "Estimate requests", "Follow-up calls"],
                },
                {
                  title: "Legal",
                  items: ["Client intake", "Consultation booking", "Case status updates", "Document collection"],
                },
                {
                  title: "Real Estate",
                  items: ["Property inquiries", "Showing scheduling", "Lead qualification", "Market updates"],
                },
              ].map((useCase) => (
                <div key={useCase.title} className="rounded-xl border border-border p-6 hover:border-foreground/15 transition-colors">
                  <h3 className="font-semibold tracking-tight mb-4">{useCase.title}</h3>
                  <ul className="space-y-2.5">
                    {useCase.items.map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <span className="h-1 w-1 rounded-full bg-foreground/20 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="py-28 md:py-40 bg-[#fafafa]">
          <div className="max-w-[1120px] mx-auto px-6">
            <div className="mb-16">
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground mb-3">Testimonials</p>
              <h2 className="text-3xl md:text-4xl display leading-tight">
                What our customers say
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {[
                {
                  quote: "We went from missing 40% of after-hours calls to capturing every single lead. Our conversion rate doubled in the first month.",
                  name: "Marcus Rivera",
                  role: "Owner, Rivera Home Services",
                },
                {
                  quote: "The voice quality is what sold us. HeyAgent was the only AI phone system our clients couldn't tell wasn't human.",
                  name: "Jennifer Walsh",
                  role: "Managing Partner, Walsh & Associates",
                },
                {
                  quote: "We handle 100% of inbound calls with only a 3% escalation rate — saving over $200K per month. Our staff can finally focus on in-office care.",
                  name: "Dr. Sarah Chen",
                  role: "CMO, Pacific Health Group",
                },
                {
                  quote: "Setup took 12 minutes. By lunch we had an AI receptionist that knew our entire menu, handled reservations, and managed our waitlist.",
                  name: "David Kim",
                  role: "Owner, Kimchi & Company",
                },
              ].map((t) => (
                <div key={t.name} className="rounded-xl border border-border bg-white p-8 flex flex-col">
                  <blockquote className="text-[15px] text-foreground/80 leading-relaxed mb-8 flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-28 md:py-40">
          <div className="max-w-[1120px] mx-auto px-6">
            <div className="rounded-2xl bg-foreground text-white p-12 md:p-20 text-center">
              <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-tight mb-5">
                Your next customer is calling.
                <br className="hidden md:block" />
                Will you be there?
              </h2>
              <p className="text-white/50 max-w-md mx-auto mb-10">
                Join hundreds of businesses scaling conversations with
                AI agents that sound genuinely human.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="bg-white text-foreground hover:bg-white/90 h-11 px-6 rounded-lg w-full sm:w-auto">
                    Start for free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white h-11 px-6 rounded-lg w-full sm:w-auto">
                    Compare plans
                  </Button>
                </Link>
              </div>
              <p className="text-white/25 text-xs mt-6">
                No credit card required
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border pt-16 pb-10">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
                  <span className="text-white font-bold text-xs">H</span>
                </div>
                <span className="font-semibold text-sm tracking-tight">HeyAgent</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                The most realistic AI voice and chat agent platform.
                Deploy production-ready agents in minutes.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: ["Voice Agents", "Chat Agents", "Features", "Pricing"],
              },
              {
                title: "Resources",
                links: ["Documentation", "API Reference", "Blog", "Changelog"],
              },
              {
                title: "Company",
                links: ["About", "Careers", "Contact", "Privacy", "Terms"],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-14 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground/50">
              &copy; {new Date().getFullYear()} HeyAgent, Inc.
            </p>
            <div className="flex items-center gap-5">
              {["Twitter", "LinkedIn", "GitHub"].map((s) => (
                <Link key={s} href="#" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
