"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

interface WorkingHours {
  [day: string]: {
    enabled: boolean
    start: string
    end: string
  }
}

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
]

interface WorkingHoursEditorProps {
  value: WorkingHours
  onChange: (value: WorkingHours) => void
}

export function WorkingHoursEditor({ value, onChange }: WorkingHoursEditorProps) {
  const updateDay = (day: string, updates: Partial<{ enabled: boolean; start: string; end: string }>) => {
    onChange({
      ...value,
      [day]: { ...value[day], ...updates },
    })
  }

  return (
    <div className="space-y-3">
      <Label>Working Hours</Label>
      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const dayConfig = value[key] || { enabled: false, start: "09:00", end: "17:00" }
          return (
            <div key={key} className="flex items-center gap-3">
              <Switch
                checked={dayConfig.enabled}
                onCheckedChange={(enabled) => updateDay(key, { enabled })}
              />
              <span className="w-24 text-sm font-medium">{label}</span>
              {dayConfig.enabled && (
                <>
                  <Input
                    type="time"
                    value={dayConfig.start}
                    onChange={(e) => updateDay(key, { start: e.target.value })}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={dayConfig.end}
                    onChange={(e) => updateDay(key, { end: e.target.value })}
                    className="w-28"
                  />
                </>
              )}
              {!dayConfig.enabled && (
                <span className="text-sm text-muted-foreground">Closed</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
