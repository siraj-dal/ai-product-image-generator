"use client"

import type { ModelSettings } from "@/lib/types"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ModelCustomizationSidebarProps {
  settings: ModelSettings
  onSettingsChange: (settings: ModelSettings) => void
}

// Hairstyle options
const hairstyles = [
  { value: "bald", label: "Bald" },
  { value: "short-straight", label: "Short Straight" },
  { value: "short-curly", label: "Short Curly" },
  { value: "medium-straight", label: "Medium Straight" },
  { value: "medium-curly", label: "Medium Curly" },
  { value: "medium-wavy", label: "Medium Wavy" },
  { value: "long-straight", label: "Long Straight" },
  { value: "long-curly", label: "Long Curly" },
  { value: "long-wavy", label: "Long Wavy" },
  { value: "braids", label: "Braids" },
]

// Skin tone options
const skinTones = [
  { value: "#F6EBE1", label: "Very Light" },
  { value: "#F1D9C0", label: "Light" },
  { value: "#E5C298", label: "Light Medium" },
  { value: "#C99F67", label: "Medium" },
  { value: "#8D5524", label: "Dark" },
  { value: "#5A3A1B", label: "Very Dark" },
]

export function ModelCustomizationSidebar({ settings, onSettingsChange }: ModelCustomizationSidebarProps) {
  const updateSettings = <K extends keyof ModelSettings>(key: K, value: ModelSettings[K]) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    })
  }

  // Convert height in inches to feet and inches for display
  const heightToFeetInches = (inches: number) => {
    const feet = Math.floor(inches / 12)
    const remainingInches = inches % 12
    return `${feet}'${remainingInches}"`
  }

  return (
    <div className="w-[300px] border-r bg-background h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Model Customization</h2>
        <p className="text-sm text-muted-foreground">Customize the virtual model</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="space-y-3">
            <Label>Gender</Label>
            <RadioGroup
              value={settings.gender}
              onValueChange={(value) => updateSettings("gender", value as ModelSettings["gender"])}
              className="flex space-x-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="gender-male" />
                <Label htmlFor="gender-male">Male</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="gender-female" />
                <Label htmlFor="gender-female">Female</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non-binary" id="gender-non-binary" />
                <Label htmlFor="gender-non-binary">Non-binary</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Body Type</Label>
              <span className="text-sm text-muted-foreground">
                {settings.bodyType < 33 ? "Petite" : settings.bodyType < 66 ? "Average" : "Plus Size"}
              </span>
            </div>
            <Slider
              value={[settings.bodyType]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => updateSettings("bodyType", value[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Petite</span>
              <span>Average</span>
              <span>Plus Size</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Skin Tone</Label>
            <div className="flex justify-between">
              {skinTones.map((tone) => (
                <button
                  key={tone.value}
                  className={`w-8 h-8 rounded-full border-2 ${
                    settings.skinTone === tone.value ? "border-primary" : "border-transparent"
                  }`}
                  style={{ backgroundColor: tone.value }}
                  onClick={() => updateSettings("skinTone", tone.value)}
                  title={tone.label}
                />
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label htmlFor="hairstyle">Hairstyle</Label>
            <Select value={settings.hairstyle} onValueChange={(value) => updateSettings("hairstyle", value)}>
              <SelectTrigger id="hairstyle">
                <SelectValue placeholder="Select hairstyle" />
              </SelectTrigger>
              <SelectContent>
                {hairstyles.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Height</Label>
              <span className="text-sm text-muted-foreground">{heightToFeetInches(settings.height)}</span>
            </div>
            <Slider
              value={[settings.height]}
              min={60} // 5'0"
              max={78} // 6'6"
              step={1}
              onValueChange={(value) => updateSettings("height", value[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5'0"</span>
              <span>5'9"</span>
              <span>6'6"</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
