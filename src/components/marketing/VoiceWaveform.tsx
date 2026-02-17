"use client"

import { useEffect, useRef } from "react"

export function VoiceWaveform() {
  const barsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bars = barsRef.current?.children
    if (!bars) return

    const intervals: NodeJS.Timeout[] = []

    Array.from(bars).forEach((bar, i) => {
      const el = bar as HTMLElement
      const animate = () => {
        const height = 16 + Math.random() * 64
        el.style.height = `${height}%`
      }
      animate()
      intervals.push(setInterval(animate, 350 + i * 40))
    })

    return () => intervals.forEach(clearInterval)
  }, [])

  return (
    <div className="relative">
      <div className="rounded-2xl border border-border bg-white p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-foreground/5 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-foreground animate-pulse-subtle" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">AI Voice Agent</p>
              <p className="text-xs text-muted-foreground">Speaking naturally...</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-50 rounded-full px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="text-[11px] font-medium text-green-700">Live</span>
          </div>
        </div>

        <div
          ref={barsRef}
          className="flex items-center justify-center gap-[2.5px] h-24"
        >
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="w-[2.5px] rounded-full bg-foreground/20 transition-all duration-300 ease-out"
              style={{ height: "16%" }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Latency: <span className="font-medium text-foreground">280ms</span></span>
            <span className="text-xs text-muted-foreground">Language: <span className="font-medium text-foreground">English</span></span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">00:42</span>
        </div>
      </div>
    </div>
  )
}
