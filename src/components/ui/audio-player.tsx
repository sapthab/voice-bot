"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Play, Pause, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AudioPlayerProps {
  src: string
  className?: string
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

export function AudioPlayer({ src, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
    } else {
      setLoading(true)
      try {
        await audio.play()
      } catch {
        setError(true)
        setLoading(false)
      }
    }
  }, [playing])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const newTime = (parseFloat(e.target.value) / 100) * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => { setPlaying(true); setLoading(false) }
    const onPause = () => setPlaying(false)
    const onEnded = () => { setPlaying(false); setCurrentTime(0) }
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onWaiting = () => setLoading(true)
    const onCanPlay = () => setLoading(false)
    const onError = () => { setError(true); setLoading(false); setPlaying(false) }

    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    audio.addEventListener("waiting", onWaiting)
    audio.addEventListener("canplay", onCanPlay)
    audio.addEventListener("error", onError)

    return () => {
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
      audio.removeEventListener("waiting", onWaiting)
      audio.removeEventListener("canplay", onCanPlay)
      audio.removeEventListener("error", onError)
    }
  }, [])

  return (
    <div className={cn("flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2", className)}>
      {/* Hidden native audio element */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={togglePlay}
        disabled={error}
        aria-label={playing ? "Pause" : "Play"}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-xs tabular-nums text-muted-foreground w-8 shrink-0">
          {formatTime(currentTime)}
        </span>

        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={handleSeek}
          disabled={!duration || error}
          className="flex-1 h-1.5 accent-primary cursor-pointer disabled:cursor-default"
          aria-label="Seek"
        />

        <span className="text-xs tabular-nums text-muted-foreground w-8 shrink-0 text-right">
          {duration ? formatTime(duration) : "--:--"}
        </span>
      </div>

      {/* Download */}
      <a
        href={src}
        download
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download recording"
        className={cn(
          "shrink-0 text-muted-foreground hover:text-foreground transition-colors",
          error && "pointer-events-none opacity-40"
        )}
      >
        <Download className="h-3.5 w-3.5" />
      </a>

      {error && (
        <span className="text-xs text-destructive shrink-0">Unavailable</span>
      )}
    </div>
  )
}
