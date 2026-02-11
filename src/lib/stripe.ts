import Stripe from "stripe"

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured")
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
    })
  }
  return stripeClient
}

export const PLANS = {
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
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
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
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
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
