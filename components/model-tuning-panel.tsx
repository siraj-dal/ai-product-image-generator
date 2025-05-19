"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { getPerformanceConfig, updatePerformanceConfig, checkWebGLCapabilities } from "@/lib/image-processing"
import type { PerformanceConfig, SegmentationModel } from "@/lib/image-processing"

interface ModelTuningPanelProps {
  modelType: SegmentationModel
  setModelType: (modelType: SegmentationModel) => void
  onSave: () => void
}

export function ModelTuningPanel({ modelType, setModelType, onSave }: ModelTuningPanelProps) {
  const [performanceConfig, setPerformanceConfig] = useState<PerformanceConfig>(getPerformanceConfig())
  const [webGLInfo, setWebGLInfo] = useState(() => checkWebGLCapabilities())

  // Model-specific settings
  const [segmentationThreshold, setSegmentationThreshold] = useState(0.7)
  const [edgeBlur, setEdgeBlur] = useState(3)
  const [internalResolution, setInternalResolution] = useState<"low" | "medium" | "high">("medium")

  // Handle performance config changes
  const handlePerformanceConfigChange = <K extends keyof PerformanceConfig>(key: K, value: PerformanceConfig[K]) => {
    const newConfig = { ...performanceConfig, [key]: value }
    setPerformanceConfig(newConfig)
    updatePerformanceConfig({ [key]: value })
  }

  // Apply all settings
  const handleApplySettings = () => {
    // Update the global performance config
    updatePerformanceConfig(performanceConfig)

    // Call the onSave callback
    onSave()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Model Fine-Tuning</CardTitle>
        <CardDescription>Adjust advanced settings to optimize performance and quality</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="model">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="model">Model Selection</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="model" className="space-y-4">
            <div className="space-y-2">
              <Label>Segmentation Model</Label>
              <Select value={modelType} onValueChange={(value) => setModelType(value as SegmentationModel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bodypix">BodyPix (Human-focused)</SelectItem>
                  <SelectItem value="deeplab">DeepLab (General objects)</SelectItem>
                  <SelectItem value="mobilenet">MobileNet (Fast, less accurate)</SelectItem>
                </SelectContent>
              </Select>

              <p className="text-sm text-muted-foreground mt-2">
                {modelType === "bodypix"
                  ? "BodyPix is optimized for human subjects and clothing items. Best for fashion products."
                  : modelType === "deeplab"
                    ? "DeepLab is a general-purpose segmentation model that works well with a variety of objects."
                    : "MobileNet is the fastest option but may be less accurate for complex images."}
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Segmentation Threshold</Label>
                  <span className="text-sm text-muted-foreground">{segmentationThreshold.toFixed(2)}</span>
                </div>
                <Slider
                  value={[segmentationThreshold * 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => setSegmentationThreshold(value[0] / 100)}
                />
                <p className="text-xs text-muted-foreground">
                  Higher values create more precise cutouts but may miss parts of the subject
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Edge Blur</Label>
                  <span className="text-sm text-muted-foreground">{edgeBlur}px</span>
                </div>
                <Slider value={[edgeBlur]} min={0} max={10} step={1} onValueChange={(value) => setEdgeBlur(value[0])} />
                <p className="text-xs text-muted-foreground">Controls the smoothness of edges in the cutout</p>
              </div>

              <div className="space-y-2">
                <Label>Internal Resolution</Label>
                <Select
                  value={internalResolution}
                  onValueChange={(value) => setInternalResolution(value as "low" | "medium" | "high")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Faster)</SelectItem>
                    <SelectItem value="medium">Medium (Balanced)</SelectItem>
                    <SelectItem value="high">High (Better quality)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="space-y-2">
              <Label>Precision</Label>
              <Select
                value={performanceConfig.precision}
                onValueChange={(value) =>
                  handlePerformanceConfigChange("precision", value as "low" | "medium" | "high")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select precision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Fastest)</SelectItem>
                  <SelectItem value="medium">Medium (Balanced)</SelectItem>
                  <SelectItem value="high">High (Best quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Memory Management</Label>
              <Select
                value={performanceConfig.memoryManagement}
                onValueChange={(value) =>
                  handlePerformanceConfigChange("memoryManagement", value as "aggressive" | "balanced" | "performance")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select memory management" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aggressive">Aggressive (Low memory usage)</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="performance">Performance (Higher memory usage)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Backend Selection</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-webgl"
                    checked={performanceConfig.useWebGL}
                    disabled={!webGLInfo.webGLAvailable}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handlePerformanceConfigChange("useWebGL", true)
                        handlePerformanceConfigChange("useWasm", false)
                        handlePerformanceConfigChange("useWebGPU", false)
                      }
                    }}
                  />
                  <Label htmlFor="use-webgl">Use WebGL</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-wasm"
                    checked={performanceConfig.useWasm}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handlePerformanceConfigChange("useWebGL", false)
                        handlePerformanceConfigChange("useWasm", true)
                        handlePerformanceConfigChange("useWebGPU", false)
                      }
                    }}
                  />
                  <Label htmlFor="use-wasm">Use WebAssembly</Label>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Switch
                  id="use-webgpu"
                  checked={performanceConfig.useWebGPU}
                  disabled={!webGLInfo.webGL2Available}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handlePerformanceConfigChange("useWebGL", false)
                      handlePerformanceConfigChange("useWasm", false)
                      handlePerformanceConfigChange("useWebGPU", true)
                    }
                  }}
                />
                <Label htmlFor="use-webgpu">Use WebGPU (Experimental)</Label>
              </div>
            </div>

            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium">System Capabilities:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>WebGL: {webGLInfo.webGLAvailable ? "Available" : "Not Available"}</li>
                <li>WebGL2: {webGLInfo.webGL2Available ? "Available" : "Not Available"}</li>
                <li>Max Texture Size: {webGLInfo.maxTextureSize}px</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <Label>Model Caching</Label>
              <div className="flex items-center space-x-2">
                <Switch id="model-caching" defaultChecked />
                <Label htmlFor="model-caching">Cache models between sessions</Label>
              </div>
              <p className="text-xs text-muted-foreground">Improves performance but uses more memory</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Batch Size</Label>
              <Select defaultValue="1">
                <SelectTrigger>
                  <SelectValue placeholder="Select batch size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 (Default)</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Number of images to process in parallel (higher values use more memory)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Worker Threads</Label>
              <Select defaultValue="auto">
                <SelectTrigger>
                  <SelectValue placeholder="Select worker threads" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Recommended)</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Number of web workers to use for processing</p>
            </div>

            <Button variant="destructive" size="sm" className="mt-2">
              Clear Model Cache
            </Button>
          </TabsContent>
        </Tabs>

        <Separator />

        <Button className="w-full" onClick={handleApplySettings}>
          Apply Settings
        </Button>
      </CardContent>
    </Card>
  )
}
