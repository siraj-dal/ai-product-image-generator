"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { batchDetectProductTypes, type DetectionResult } from "@/lib/product-detection"
import { AlertCircle, Trash, Download, Image, CheckCircle } from "lucide-react"

interface BatchImage {
  id: string
  file: File
  dataUrl: string
  element?: HTMLImageElement
  result?: DetectionResult | null
}

export function BatchDetection() {
  const [images, setImages] = useState<BatchImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.2)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages: BatchImage[] = []

      Array.from(e.target.files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader()

          reader.onload = (event) => {
            if (event.target && event.target.result) {
              const dataUrl = event.target.result as string

              newImages.push({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                file,
                dataUrl,
              })

              // If all files have been processed, update state
              if (newImages.length === e.target.files!.length) {
                setImages((prev) => [...prev, ...newImages])
              }
            }
          }

          reader.readAsDataURL(file)
        }
      })

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Remove image
  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  // Clear all images
  const clearImages = () => {
    setImages([])
    setSuccess(null)
    setError(null)
  }

  // Process images
  const processImages = async () => {
    if (images.length === 0) {
      setError("Please add images to process")
      return
    }

    try {
      setIsProcessing(true)
      setProgress(0)
      setError(null)
      setSuccess(null)

      // Load images into HTML elements for processing
      const loadedImages = await Promise.all(
        images.map(async (img) => {
          return new Promise<BatchImage>((resolve) => {
            const imgElement = new Image()
            imgElement.onload = () => {
              resolve({
                ...img,
                element: imgElement,
              })
            }
            imgElement.src = img.dataUrl
          })
        }),
      )

      setImages(loadedImages)

      // Process images in batch
      const imageElements = loadedImages.map((img) => img.element!)
      const results = await batchDetectProductTypes(imageElements, confidenceThreshold, (progress) =>
        setProgress(Math.round(progress * 100)),
      )

      // Update images with results
      const updatedImages = loadedImages.map((img, index) => ({
        ...img,
        result: results[index],
      }))

      setImages(updatedImages)
      setSuccess(`Processed ${results.filter((r) => r !== null).length} out of ${results.length} images successfully`)
    } catch (err) {
      setError("Error processing images: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsProcessing(false)
    }
  }

  // Export results as CSV
  const exportResults = () => {
    const processedImages = images.filter((img) => img.result)

    if (processedImages.length === 0) {
      setError("No processed images to export")
      return
    }

    // Create CSV content
    const headers = ["Filename", "Category", "Confidence", "Suggested Names"]
    const rows = processedImages.map((img) => [
      img.file.name,
      img.result?.category || "Unknown",
      img.result?.confidence.toFixed(4) || "0",
      img.result?.suggestedNames.join(", ") || "",
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "product_detection_results.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Batch Detection</CardTitle>
        <CardDescription>Process multiple product images at once</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="confidence-threshold">Confidence Threshold: {confidenceThreshold.toFixed(2)}</Label>
            </div>
            <Slider
              id="confidence-threshold"
              min={0.05}
              max={0.95}
              step={0.05}
              value={[confidenceThreshold]}
              onValueChange={(value) => setConfidenceThreshold(value[0])}
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground">
              Higher values require more confidence for detection but may miss some products
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch-upload">Upload Images</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="batch-upload"
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isProcessing}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                <Image className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="destructive" onClick={clearImages} disabled={isProcessing || images.length === 0}>
          <Trash className="h-4 w-4 mr-2" />
          Clear
        </Button>

        <div>
          <Button variant="secondary" onClick={exportResults} disabled={isProcessing || images.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={processImages} disabled={isProcessing || images.length === 0}>
            {isProcessing ? "Processing..." : "Process"}
          </Button>
        </div>
      </CardFooter>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {isProcessing && <Progress value={progress} className="mb-4" />}

      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <Card key={img.id}>
              <CardHeader>
                <CardTitle>{img.file.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <img
                  src={img.dataUrl || "/placeholder.svg"}
                  alt={img.file.name}
                  className="max-h-48 object-contain mb-2"
                />
                {img.result ? (
                  <div className="space-y-1">
                    <Badge variant="secondary">{img.result.category}</Badge>
                    <p className="text-sm text-muted-foreground">Confidence: {img.result.confidence.toFixed(4)}</p>
                    {img.result.suggestedNames.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">Suggested Names:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {img.result.suggestedNames.map((name, index) => (
                            <li key={index}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{isProcessing ? "Processing..." : "Not processed"}</p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" onClick={() => removeImage(img.id)} disabled={isProcessing}>
                  <Trash className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </Card>
  )
}
