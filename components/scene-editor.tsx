"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface SceneEditorProps {
  productImage: string | null
  generatedImage: string | null
  isGenerating: boolean
  backgroundType: "studio" | "lifestyle"
  setBackgroundType: (type: "studio" | "lifestyle") => void
  brightness: number
  setBrightness: (value: number) => void
  contrast: number
  setContrast: (value: number) => void
}

export function SceneEditor({
  productImage,
  generatedImage,
  isGenerating,
  backgroundType,
  setBackgroundType,
  brightness,
  setBrightness,
  contrast,
  setContrast,
}: SceneEditorProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0 relative">
          <div className="aspect-square w-full relative overflow-hidden rounded-md">
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Generating image with AI...</p>
                <p className="text-sm text-muted-foreground">This may take 15-30 seconds</p>
              </div>
            ) : null}

            {generatedImage ? (
              <img
                src={generatedImage || "/placeholder.svg"}
                alt="Generated product on model"
                className="w-full h-full object-cover"
                style={{
                  filter: `brightness(${brightness / 50}) contrast(${contrast / 50})`,
                }}
              />
            ) : productImage ? (
              <div className="flex items-center justify-center h-full bg-muted">
                <div className="text-center p-6">
                  <img
                    src={productImage || "/placeholder.svg"}
                    alt="Product preview"
                    className="max-h-[300px] mx-auto object-contain mb-4"
                  />
                  <p className="text-lg font-medium">Ready to generate</p>
                  <p className="text-sm text-muted-foreground">Click the Generate button to create your image</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-muted">
                <div className="text-center p-6">
                  <p className="text-lg font-medium">No image selected</p>
                  <p className="text-sm text-muted-foreground">Upload a product image to get started</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <Label>Background Type</Label>
                <Tabs
                  value={backgroundType}
                  onValueChange={(value) => setBackgroundType(value as "studio" | "lifestyle")}
                  className="mt-2"
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="studio" className="flex-1">
                      Studio White
                    </TabsTrigger>
                    <TabsTrigger value="lifestyle" className="flex-1">
                      Lifestyle
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Brightness</Label>
                  <span className="text-sm text-muted-foreground">{brightness}%</span>
                </div>
                <Slider
                  value={[brightness]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => setBrightness(value[0])}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Contrast</Label>
                  <span className="text-sm text-muted-foreground">{contrast}%</span>
                </div>
                <Slider
                  value={[contrast]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => setContrast(value[0])}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
