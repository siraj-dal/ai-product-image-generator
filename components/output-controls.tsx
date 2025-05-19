"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Sparkles, Share2, Save } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface OutputControlsProps {
  onGenerate: () => void
  isGenerating: boolean
  resolution: "512x512" | "1024x1024"
  setResolution: (resolution: "512x512" | "1024x1024") => void
  generatedImage: string | null
  disabled: boolean
}

export function OutputControls({
  onGenerate,
  isGenerating,
  resolution,
  setResolution,
  generatedImage,
  disabled,
}: OutputControlsProps) {
  const handleDownload = (format: "png" | "jpg" | "webp") => {
    if (!generatedImage) return

    // In a real app, you would convert the image to the requested format
    // For this demo, we'll just download the image as-is
    const link = document.createElement("a")
    link.href = generatedImage
    link.download = `generated-product-image.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = async () => {
    if (!generatedImage) return

    try {
      // Check if the Web Share API is available
      if (navigator.share) {
        // Convert the data URL to a blob
        const response = await fetch(generatedImage)
        const blob = await response.blob()

        // Create a file from the blob
        const file = new File([blob], "generated-product-image.png", { type: "image/png" })

        // Share the file
        await navigator.share({
          title: "AI Generated Product Image",
          text: "Check out this product image I generated with AI!",
          files: [file],
        })
      } else {
        // Fallback for browsers that don't support the Web Share API
        // Copy the image to clipboard
        const response = await fetch(generatedImage)
        const blob = await response.blob()

        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ])

        alert("Image copied to clipboard!")
      }
    } catch (error) {
      console.error("Error sharing image:", error)
    }
  }

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 p-4">
      <div className="container flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={resolution} onValueChange={(value) => setResolution(value as "512x512" | "1024x1024")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select resolution" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="512x512">512 × 512</SelectItem>
              <SelectItem value="1024x1024">1024 × 1024</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!generatedImage}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleDownload("png")}>PNG Format</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("jpg")}>JPG Format</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("webp")}>WebP Format</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" disabled={!generatedImage} onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" disabled={!generatedImage}>
            <Save className="h-4 w-4 mr-2" />
            Save to Gallery
          </Button>

          <Button onClick={onGenerate} disabled={disabled || isGenerating} className="min-w-[120px]">
            {isGenerating ? (
              <>Generating...</>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
