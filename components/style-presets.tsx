"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { StylePreset } from "@/lib/types"

interface StylePresetsProps {
  onSelectPreset: (preset: StylePreset) => void
}

const presets: StylePreset[] = [
  {
    id: "ecommerce",
    name: "E-commerce White",
    description: "Clean studio white background for product listings",
    backgroundType: "studio",
    brightness: 55,
    contrast: 50,
    thumbnail: "/placeholder.svg?key=8aeww",
  },
  {
    id: "outdoor",
    name: "Outdoor Lifestyle",
    description: "Natural outdoor setting with soft lighting",
    backgroundType: "lifestyle",
    brightness: 52,
    contrast: 55,
    thumbnail: "/placeholder.svg?key=kqke2",
  },
  {
    id: "holiday",
    name: "Holiday Theme",
    description: "Festive holiday setting with warm tones",
    backgroundType: "lifestyle",
    brightness: 48,
    contrast: 60,
    thumbnail: "/placeholder.svg?height=80&width=80&query=holiday themed background",
  },
  {
    id: "summer",
    name: "Summer Vibes",
    description: "Bright summer setting with vibrant colors",
    backgroundType: "lifestyle",
    brightness: 60,
    contrast: 55,
    thumbnail: "/placeholder.svg?height=80&width=80&query=summer themed background",
  },
]

export function StylePresets({ onSelectPreset }: StylePresetsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Style Presets</CardTitle>
        <CardDescription>Apply pre-configured styles to your scene</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center space-x-3 rounded-md border p-3 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => onSelectPreset(preset)}
            >
              <img
                src={preset.thumbnail || "/placeholder.svg"}
                alt={preset.name}
                className="h-12 w-12 rounded-md object-cover"
              />
              <div>
                <h4 className="text-sm font-medium">{preset.name}</h4>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
