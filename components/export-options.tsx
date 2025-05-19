"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Download, Copy, FileImage, Loader2 } from "lucide-react"

interface ExportOptionsProps {
  imageUrl: string | null
  onExport: (options: ExportOptions) => Promise<string>
  isExporting?: boolean
}

export interface ExportOptions {
  format: "png" | "jpg" | "webp"
  quality: number
  width: number
  height: number
  filename: string
  includeMetadata: boolean
  optimizeForWeb: boolean
}

export function ExportOptions({ imageUrl, onExport, isExporting = false }: ExportOptionsProps) {
  const [activeTab, setActiveTab] = useState<"image" | "metadata">("image")
  const [exportFormat, setExportFormat] = useState<"png" | "jpg" | "webp">("png")
  const [quality, setQuality] = useState(90)
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true)
  const [filename, setFilename] = useState("product-image")
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [optimizeForWeb, setOptimizeForWeb] = useState(true)
  const [exportedUrl, setExportedUrl] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  // Calculate file size estimate
  const getFileSizeEstimate = (): string => {
    if (!imageUrl) return "Unknown"

    // Very rough estimate based on dimensions and format
    const pixelCount = width * height
    let bytesPerPixel = 4 // PNG (RGBA)

    if (exportFormat === "jpg") {
      bytesPerPixel = (quality / 100) * 0.25 // JPG compression estimate
    } else if (exportFormat === "webp") {
      bytesPerPixel = (quality / 100) * 0.2 // WebP is more efficient
    }

    const sizeInBytes = pixelCount * bytesPerPixel

    if (sizeInBytes < 1024) {
      return `${sizeInBytes.toFixed(2)} B`
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(2)} KB`
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
    }
  }

  // Handle export
  const handleExport = async () => {
    if (!imageUrl) return

    try {
      const exportedImageUrl = await onExport({
        format: exportFormat,
        quality,
        width,
        height,
        filename,
        includeMetadata,
        optimizeForWeb,
      })

      setExportedUrl(exportedImageUrl)
    } catch (error) {
      console.error("Export error:", error)
    }
  }

  // Handle download
  const handleDownload = () => {
    if (!exportedUrl && !imageUrl) return

    const link = document.createElement("a")
    link.href = exportedUrl || imageUrl || ""
    link.download = `${filename}.${exportFormat}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!exportedUrl && !imageUrl) return

    try {
      // Fetch the image as a blob
      const response = await fetch(exportedUrl || imageUrl || "")
      const blob = await response.blob()

      // Copy to clipboard using the Clipboard API
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ])

      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error("Error copying image:", error)
    }
  }

  // Handle aspect ratio changes
  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth)
    if (maintainAspectRatio && imageUrl) {
      const img = new Image()
      img.src = imageUrl
      const aspectRatio = img.width / img.height
      setHeight(Math.round(newWidth / aspectRatio))
    }
  }

  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight)
    if (maintainAspectRatio && imageUrl) {
      const img = new Image()
      img.src = imageUrl
      const aspectRatio = img.width / img.height
      setWidth(Math.round(newHeight * aspectRatio))
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Export Options</CardTitle>
        <CardDescription>Customize and export your generated image</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "image" | "metadata")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="image">Image Settings</TabsTrigger>
            <TabsTrigger value="metadata">Metadata & Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="space-y-4">
            <div className="space-y-2">
              <Label>File Format</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={exportFormat === "png" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setExportFormat("png")}
                >
                  PNG
                </Button>
                <Button
                  variant={exportFormat === "jpg" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setExportFormat("jpg")}
                >
                  JPG
                </Button>
                <Button
                  variant={exportFormat === "webp" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setExportFormat("webp")}
                >
                  WebP
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {exportFormat === "png"
                  ? "PNG: Best for transparency and sharp details, larger file size"
                  : exportFormat === "jpg"
                    ? "JPG: Smaller file size, good for photos, no transparency"
                    : "WebP: Modern format with good compression and quality, limited compatibility"}
              </p>
            </div>

            {exportFormat !== "png" && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Quality</Label>
                  <span className="text-sm text-muted-foreground">{quality}%</span>
                </div>
                <Slider value={[quality]} min={10} max={100} step={1} onValueChange={(value) => setQuality(value[0])} />
                <p className="text-xs text-muted-foreground">Higher quality means larger file size</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  min={1}
                  value={width}
                  onChange={(e) => handleWidthChange(Number.parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  min={1}
                  value={height}
                  onChange={(e) => handleHeightChange(Number.parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="aspect-ratio" checked={maintainAspectRatio} onCheckedChange={setMaintainAspectRatio} />
              <Label htmlFor="aspect-ratio">Maintain aspect ratio</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <div className="flex space-x-2">
                <Input
                  id="filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="Enter filename"
                />
                <span className="flex items-center px-3 bg-muted rounded-md text-muted-foreground">
                  .{exportFormat}
                </span>
              </div>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <div className="flex justify-between text-sm">
                <span>Estimated file size:</span>
                <span className="font-medium">{getFileSizeEstimate()}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-metadata">Include Metadata</Label>
                <p className="text-sm text-muted-foreground">Embed information about the generation process</p>
              </div>
              <Switch id="include-metadata" checked={includeMetadata} onCheckedChange={setIncludeMetadata} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="optimize-web">Optimize for Web</Label>
                <p className="text-sm text-muted-foreground">Apply additional optimizations for web usage</p>
              </div>
              <Switch id="optimize-web" checked={optimizeForWeb} onCheckedChange={setOptimizeForWeb} />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Export Preset</Label>
              <Select defaultValue="custom">
                <SelectTrigger>
                  <SelectValue placeholder="Select preset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web Optimized</SelectItem>
                  <SelectItem value="print">Print Quality</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col space-y-2 mt-6">
          <Button onClick={handleExport} disabled={!imageUrl || isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileImage className="mr-2 h-4 w-4" />
                Generate Export
              </>
            )}
          </Button>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button variant="outline" onClick={handleDownload} disabled={!exportedUrl && !imageUrl}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" onClick={handleCopy} disabled={!exportedUrl && !imageUrl}>
              {isCopied ? (
                <>Copied!</>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
