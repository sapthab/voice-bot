import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Bot,
  MessageSquare,
  Globe,
  Users,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react"

const features = [
  {
    icon: Globe,
    title: "Train on Your Website",
    description:
      "Simply paste your URL and we'll automatically train your AI on your website content, services, and FAQs.",
  },
  {
    icon: MessageSquare,
    title: "Natural Conversations",
    description:
      "Powered by GPT-4o, your agent handles inquiries naturally and professionally, 24 hours a day.",
  },
  {
    icon: Users,
    title: "Capture Leads",
    description:
      "Automatically collect visitor information and qualify leads during conversations.",
  },
  {
    icon: Zap,
    title: "Instant Setup",
    description:
      "Get your AI receptionist live in minutes. No coding required - just copy and paste the embed code.",
  },
  {
    icon: Shield,
    title: "Industry Templates",
    description:
      "Pre-built templates for home services, dental, medical, legal, and more industries.",
  },
  {
    icon: Bot,
    title: "Custom Personality",
    description:
      "Customize your agent's tone, responses, and behavior to match your brand voice.",
  },
]

const testimonials = [
  {
    quote:
      "VoiceBot AI handles 80% of our customer inquiries automatically. Our team can focus on what matters most.",
    author: "Sarah Johnson",
    role: "Owner, Johnson Plumbing",
  },
  {
    quote:
      "Setup took 10 minutes and we started capturing leads immediately. The ROI has been incredible.",
    author: "Dr. Michael Chen",
    role: "Dental Practice Owner",
  },
]

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold heading text-lg">VoiceBot AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
          <div className="md:hidden">
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl lg:text-6xl font-bold heading mb-6">
                Your AI Receptionist That Never Sleeps
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Train an AI agent on your website content to handle customer
                inquiries 24/7. Capture leads, answer questions, and delight
                customers - all on autopilot.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    View Pricing
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                No credit card required • 100 free messages/month
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold heading mb-4">
                Everything You Need
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Powerful features to automate your customer communication and
                grow your business.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardContent className="pt-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold heading mb-4">
                Up and Running in 3 Steps
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Select Your Industry",
                  description:
                    "Choose from our pre-built templates or start with a general agent.",
                },
                {
                  step: "2",
                  title: "Train on Your Website",
                  description:
                    "Paste your URL and we'll automatically learn about your business.",
                },
                {
                  step: "3",
                  title: "Go Live",
                  description:
                    "Copy the embed code to your website and start chatting with visitors.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold heading mb-4">
                Loved by Businesses
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.author}>
                  <CardContent className="pt-6">
                    <p className="text-lg mb-4">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="py-12 text-center">
                <h2 className="text-3xl font-bold heading mb-4">
                  Ready to Automate Your Customer Support?
                </h2>
                <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                  Join hundreds of businesses using VoiceBot AI to handle
                  customer inquiries and capture leads automatically.
                </p>
                <Link href="/signup">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="font-semibold"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold heading">VoiceBot AI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered receptionist for your business. Handle customer
                inquiries 24/7.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/pricing" className="hover:text-foreground">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="hover:text-foreground">
                    Features
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} VoiceBot AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
