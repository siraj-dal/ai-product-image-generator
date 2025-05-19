"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, Loader2, Plus, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { processImage } from "@/lib/image-processing"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ProductTypeDetector } from "@/components/product-type-detector"
import type { SegmentationModel } from "@/lib/image-processing"
import type { ProductType } from "@/lib/prompt-templates"

interface UploadSectionProps {
  onUploadComplete: (imageUrl: string) => void
  backgroundRemoved: boolean
  setBackgroundRemoved: (value: boolean) => void
  autoCrop: boolean
  setAutoCrop: (value: boolean) => void
  modelType?: SegmentationModel
  setModelType?: (value: SegmentationModel) => void
  onProductTypeDetected?: (productType: ProductType, suggestedName: string) => void
}

export function UploadSection({
  onUploadComplete,
  backgroundRemoved,
  setBackgroundRemoved,
  autoCrop,
  setAutoCrop,
  modelType = "bodypix",
  setModelType,
  onProductTypeDetected,
}: UploadSectionProps) {
  const { toast } = useToast()
  const [uploadedImages, setUploadedImages] = useState<{ id: string; url: string; processed?: string }[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState<string | null>(null)
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [activeTab, setActiveTab] = useState<"upload" | "gallery">("upload")

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      // Process each file
      const newImages = await Promise.all(
        acceptedFiles.map(async (file) => {
          // Check file type
          if (!file.type.startsWith("image/")) {
            toast({
              title: "Invalid file type",
              description: `File "${file.name}" is not an image.`,
              variant: "destructive",
            })
            return null
          }

          // Check file size (max 10MB)
          if (file.size > 10 * 1024 * 1024) {
            toast({
              title: "File too large",
              description: `File "${file.name}" is larger than 10MB.`,
              variant: "destructive",
            })
            return null
          }

          // Create a preview URL
          const imageUrl = URL.createObjectURL(file)
          return {
            id: Math.random().toString(36).substring(2, 11),
            url: imageUrl,
            name: file.name,
          }
        }),
      )

      // Filter out null values and add to state
      const validImages = newImages.filter(Boolean) as { id: string; url: string; name: string }[]

      if (validImages.length > 0) {
        setUploadedImages((prev) => [...prev, ...validImages])

        // Select the first image if none is selected
        if (!selectedImageId) {
          setSelectedImageId(validImages[0].id)
        }

        // Switch to gallery tab if multiple images were uploaded
        if (validImages.length > 1) {
          setActiveTab("gallery")
        }
      }
    },
    [toast, selectedImageId],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: true,
  })

  // When a new image is selected, notify parent component
  useEffect(() => {
    if (selectedImageId) {
      const selectedImage = uploadedImages.find((img) => img.id === selectedImageId)
      if (selectedImage?.processed) {
        onUploadComplete(selectedImage.processed)
      } else if (selectedImage) {
        onUploadComplete(selectedImage.url)
      }
    }
  }, [selectedImageId, uploadedImages, onUploadComplete])

  const handleProcess = async () => {
    if (batchProcessing) {
      await processBatch()
    } else {
      await processSingleImage()
    }
  }

  const processSingleImage = async () => {
    if (!selectedImageId) return

    const selectedImage = uploadedImages.find((img) => img.id === selectedImageId)
    if (!selectedImage) return

    setIsProcessing(true)
    setProcessingProgress("Loading TensorFlow.js models...")

    try {
      // First, load the TensorFlow.js models
      await import("@tensorflow/tfjs")
      await import("@tensorflow/tfjs-backend-webgl")

      setProcessingProgress("Processing image...")

      // Process the image with our custom functions
      const processedImage = await processImage(selectedImage.url, {
        removeBackground: backgroundRemoved,
        autoCrop: autoCrop,
        backgroundColor: { r: 255, g: 255, b: 255, a: 1 }, // White background
        modelType,
        progressCallback: (progress, message) => {
          setProcessingProgress(`${message} (${Math.round(progress * 100)}%)`)
        },
      })

      // Update the processed image in state
      setUploadedImages((prev) =>
        prev.map((img) => (img.id === selectedImageId ? { ...img, processed: processedImage } : img)),
      )

      onUploadComplete(processedImage)

      toast({
        title: "Processing complete",
        description: `Image processed successfully${backgroundRemoved ? " with background removed" : ""}${autoCrop ? " and auto-cropped" : ""}.`,
      })
    } catch (error) {
      console.error("Processing error:", error)
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "There was an error processing your image.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setProcessingProgress(null)
    }
  }

  const processBatch = async () => {
    if (uploadedImages.length === 0) return

    setIsProcessing(true)
    setBatchProgress({ current: 0, total: uploadedImages.length })
    setProcessingProgress("Preparing batch processing...")

    try {
      // First, load the TensorFlow.js models
      await import("@tensorflow/tfjs")
      await import("@tensorflow/tfjs-backend-webgl")

      // Process each image in sequence
      for (let i = 0; i < uploadedImages.length; i++) {
        const image = uploadedImages[i]
        setBatchProgress({ current: i + 1, total: uploadedImages.length })
        setProcessingProgress(`Processing image ${i + 1} of ${uploadedImages.length}...`)

        // Process the image
        const processedImage = await processImage(image.url, {
          removeBackground: backgroundRemoved,
          autoCrop: autoCrop,
          backgroundColor: { r: 255, g: 255, b: 255, a: 1 }, // White background
          modelType,
          progressCallback: (progress, message) => {
            setProcessingProgress(
              `Image ${i + 1}/${uploadedImages.length}: ${message} (${Math.round(progress * 100)}%)`,
            )
          },
        })

        // Update the processed image in state
        setUploadedImages((prev) =>
          prev.map((img) => (img.id === image.id ? { ...img, processed: processedImage } : img)),
        )

        // If this is the selected image, update the preview
        if (image.id === selectedImageId) {
          onUploadComplete(processedImage)
        }
      }

      toast({
        title: "Batch processing complete",
        description: `Processed ${uploadedImages.length} images successfully.`,
      })
    } catch (error) {
      console.error("Batch processing error:", error)
      toast({
        title: "Batch processing failed",
        description: error instanceof Error ? error.message : "There was an error processing your images.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setProcessingProgress(null)
      setBatchProgress({ current: 0, total: 0 })
    }
  }

  const handleRemoveImage = (id: string) => {
    const imageToRemove = uploadedImages.find((img) => img.id === id)
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.url)
      if (imageToRemove.processed) {
        URL.revokeObjectURL(imageToRemove.processed)
      }
    }

    setUploadedImages((prev) => prev.filter((img) => img.id !== id))

    // If the removed image was selected, select another one
    if (id === selectedImageId) {
      const remainingImages = uploadedImages.filter((img) => img.id !== id)
      setSelectedImageId(remainingImages.length > 0 ? remainingImages[0].id : null)
    }
  }

  const handleRemoveAllImages = () => {
    // Revoke all object URLs
    uploadedImages.forEach((img) => {
      URL.revokeObjectURL(img.url)
      if (img.processed) {
        URL.revokeObjectURL(img.processed)
      }
    })

    setUploadedImages([])
    setSelectedImageId(null)
  }

  const selectedImage = selectedImageId ? uploadedImages.find((img) => img.id === selectedImageId) : null

  // Handle product type detection
  const handleProductTypeDetected = (productType: ProductType, suggestedName: string) => {
    if (onProductTypeDetected) {
      onProductTypeDetected(productType, suggestedName)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as "upload" | "gallery")}>
              <TabsList className="mb-4">
                <TabsTrigger value="upload">Upload</TabsTrigger>
                <TabsTrigger value="gallery" disabled={uploadedImages.length === 0}>
                  Gallery ({uploadedImages.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="rounded-full bg-primary/10 p-4">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">Drag & drop your product images</p>
                      <p className="text-sm text-muted-foreground">or click to browse (PNG, JPG, WEBP)</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {uploadedImages.length > 0
                          ? `${uploadedImages.length} image${uploadedImages.length !== 1 ? "s" : ""} uploaded`
                          : "No images uploaded yet"}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="gallery">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Uploaded Images</h3>
                    <Button variant="outline" size="sm" onClick={handleRemoveAllImages}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove All
                    </Button>
                  </div>

                  <ScrollArea className="h-[300px] rounded-md border">
                    <div className="p-4 grid grid-cols-2 gap-4">
                      {uploadedImages.map((image) => (
                        <div
                          key={image.id}
                          className={`relative rounded-md overflow-hidden border-2 cursor-pointer transition-all ${
                            selectedImageId === image.id
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-transparent"
                          }`}
                          onClick={() => setSelectedImageId(image.id)}
                        >
                          <img
                            src={image.processed || image.url}
                            alt="Product"
                            className="w-full h-32 object-contain bg-muted"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveImage(image.id)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          {image.processed && (
                            <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-xs py-1 px-2 text-center">
                              Processed
                            </div>
                          )}
                        </div>
                      ))}
                      <div
                        {...getRootProps()}
                        className="border-2 border-dashed rounded-md h-32 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <input {...getInputProps()} />
                        <Plus className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>

            {selectedImage && (
              <div className="mt-4">
                <Separator className="my-4" />
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Selected Image</h3>
                  {selectedImage.processed ? (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Processed</span>
                  ) : (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">Not Processed</span>
                  )}
                </div>
                <div className="mt-2 relative rounded-md overflow-hidden border">
                  <img
                    src={selectedImage.processed || selectedImage.url}
                    alt="Selected product"
                    className="w-full max-h-[200px] object-contain mx-auto"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Image Processing Options</h3>
                <p className="text-sm text-muted-foreground">Optimize your product image before generating</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="background-removal">Background Removal</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically remove the background from your product
                    </p>
                  </div>
                  <Switch id="background-removal" checked={backgroundRemoved} onCheckedChange={setBackgroundRemoved} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-crop">Auto Crop</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically crop the image to focus on the product
                    </p>
                  </div>
                  <Switch id="auto-crop" checked={autoCrop} onCheckedChange={setAutoCrop} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="batch-processing">Batch Processing</Label>
                    <p className="text-sm text-muted-foreground">Process all uploaded images at once</p>
                  </div>
                  <Switch id="batch-processing" checked={batchProcessing} onCheckedChange={setBatchProcessing} />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="model-type">Segmentation Model</Label>
                  <Tabs
                    value={modelType}
                    onValueChange={(value) => setModelType?.(value as SegmentationModel)}
                    className="w-full"
                  >
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="bodypix">BodyPix</TabsTrigger>
                      <TabsTrigger value="deeplab">DeepLab</TabsTrigger>
                      <TabsTrigger value="mobilenet">MobileNet</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <p className="text-xs text-muted-foreground">
                    {modelType === "bodypix"
                      ? "Best for human subjects and clothing"
                      : modelType === "deeplab"
                        ? "Best for general objects and scenes"
                        : "Fastest but less accurate"}
                  </p>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={(batchProcessing ? uploadedImages.length === 0 : !selectedImageId) || isProcessing}
                onClick={handleProcess}
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {processingProgress || "Processing..."}
                  </div>
                ) : batchProcessing ? (
                  `Process All Images (${uploadedImages.length})`
                ) : (
                  "Process Selected Image"
                )}
              </Button>

              {isProcessing && batchProcessing && batchProgress.total > 0 && (
                <div className="w-full bg-muted rounded-full h-2.5 dark:bg-muted">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  ></div>
                </div>
              )}

              {isProcessing && (
                <p className="text-xs text-muted-foreground text-center">
                  First-time processing may take a few moments to load the TensorFlow.js models
                </p>
              )}
            </CardContent>
          </Card>

          {/* Product Type Detection */}
          {selectedImage && (
            <ProductTypeDetector
              imageUrl={selectedImage.processed || selectedImage.url}
              onProductTypeDetected={handleProductTypeDetected}
            />
          )}
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>For best results, use high-quality images of your products on a clean background.</p>
      </div>
    </div>
  )
}
