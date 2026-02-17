import type { Metadata } from "next"
import localFont from "next/font/local"
import { Inter, Space_Grotesk } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap",
})

const geistSans = localFont({
  src: "./fonts/geist-sans.woff2",
  variable: "--font-geist",
  display: "swap",
})

const waldenburgNormal = localFont({
  src: "./fonts/waldenburg-normal.woff2",
  variable: "--font-waldenburg",
  display: "swap",
  weight: "400",
})

const waldenburgBuch = localFont({
  src: "./fonts/waldenburg-buch.woff2",
  variable: "--font-waldenburg-buch",
  display: "swap",
  weight: "350",
})

const waldenburgFett = localFont({
  src: "./fonts/waldenburg-fett.woff2",
  variable: "--font-waldenburg-fett",
  display: "swap",
  weight: "700",
})

const waldenburgFettHalbschmal = localFont({
  src: "./fonts/waldenburg-fett-halbschmal.woff2",
  variable: "--font-waldenburg-condensed",
  display: "swap",
  weight: "700",
})

export const metadata: Metadata = {
  title: "HeyAgent — AI Voice & Chat Agents for Business",
  description:
    "Deploy human-like AI voice and chat agents that handle customer calls 24/7. Train on your content, capture leads, and scale without limits.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${geistSans.variable} ${waldenburgNormal.variable} ${waldenburgBuch.variable} ${waldenburgFett.variable} ${waldenburgFettHalbschmal.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  )
}
