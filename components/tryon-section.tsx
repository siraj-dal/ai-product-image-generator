"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { processImage } from "@/lib/image-processing"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ProductTypeDetector } from "@/components/product-type-detector"
import type { SegmentationModel } from "@/lib/image-processing"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  productTypes,
  promptTemplates,
  getTemplatesForProductType,
  getDefaultTemplateForProductType,
  fillPromptTemplate,
  type ProductType,
} from "@/lib/prompt-templates"
import {
  Shirt,
  HardDriveIcon as Boot,
  Watch,
  Smartphone,
  Sofa,
  Sparkles,
  Dumbbell,
  Gamepad2,
  Plus,
  Copy,
  RefreshCw,
  Wand2,
  Upload,
  X,
  Loader2,
  Trash2,
} from "lucide-react"
import { formatHeight } from "@/lib/utils"
import type { ModelSettings } from "@/lib/types"

interface UploadSectionProps {
  onUploadComplete: (imageUrl: string) => void
  backgroundRemoved: boolean
  setBackgroundRemoved: (value: boolean) => void
  autoCrop: boolean
  modelSettings: ModelSettings
  backgroundType: "studio" | "lifestyle"
  setAutoCrop: (value: boolean) => void
  modelType?: SegmentationModel
  setModelType?: (value: SegmentationModel) => void
  onProductTypeDetected?: (productType: ProductType, suggestedName: string) => void
  contrast: number
  productName?: string
  brightness : number
  onPromptChange: (prompt: string, negativePrompt?: string) => void
  onProductTypeChange?: (productType: ProductType) => void
}

export function TryOnSection({
  onUploadComplete,
  backgroundRemoved,
  setBackgroundRemoved,
  autoCrop,
  setAutoCrop,
  modelType,
  modelSettings,
  brightness,
  backgroundType,
  setModelType = (value: SegmentationModel) => {},
  onProductTypeDetected,
  contrast,
  productName = "product",
  onPromptChange,
  onProductTypeChange,
}: UploadSectionProps) {
  const { toast } = useToast()
  const [uploadedImages, setUploadedImages] = useState<{ id: string; url: string; processed?: string }[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState<string | null>(null)
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [parentTab, setParentTab] = useState<"generate" | "upload" | "gallery">("generate")
  const [childTab, setChildTab] = useState<"templates" | "custom">("templates")
  const [previewPrompt, setPreviewPrompt] = useState<string>("")
  const [customPrompt, setCustomPrompt] = useState<string>("")
  const [customNegativePrompt, setCustomNegativePrompt] = useState<string>("")
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<string>("clothing")
  const [productSpecificName, setProductSpecificName] = useState<string>("")

  // Initialize with the default template for the selected product type
  useEffect(() => {
    const defaultTemplate = getDefaultTemplateForProductType(selectedProductTypeId)
    if (defaultTemplate) {
      setSelectedTemplateId(defaultTemplate.id)
      setCustomPrompt(defaultTemplate.template)
      setCustomNegativePrompt(defaultTemplate.negativePrompt || "")
      // Call updatePreviewPrompt after setting the template
      setTimeout(() => updatePreviewPrompt(), 0)
    }
  }, [selectedProductTypeId])

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
          setParentTab("gallery")
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

  // Get the product-specific field name based on the product type
  const getProductFieldName = (productTypeId: string): string => {
    switch (productTypeId) {
      case "clothing":
        return "clothing_type"
      case "footwear":
        return "footwear_type"
      case "accessories":
        return "accessory_type"
      case "electronics":
        return "electronics_type"
      case "home":
        return "home_item_type"
      case "beauty":
        return "beauty_product_type"
      case "sports":
        return "sports_item_type"
      case "toys":
        return "toy_type"
      default:
        return ""
    }
  }

  // Update the preview prompt when template or settings change
  const updatePreviewPrompt = () => {
    console.log("updatePreviewPrompt called")
    console.log("modelSettings:", modelSettings)
    console.log("selectedTemplateId:", selectedTemplateId)
    console.log("customPrompt:", customPrompt)
    console.log("isCustomizing:", isCustomizing)

    // If modelSettings is not available yet, don't update the prompt
    if (!modelSettings) {
      console.log("modelSettings not available yet")
      setPreviewPrompt("")
      return
    }

    // Get the current template
    const currentTemplate = isCustomizing
      ? customPrompt
      : promptTemplates.find((t) => t.id === selectedTemplateId)?.template || ""

    console.log("currentTemplate:", currentTemplate)

    // Get the product-specific field name based on the product type
    const productFieldName = getProductFieldName(selectedProductTypeId)

    // Create values object for template filling with default values
    const values: { [key: string]: string } = {
      gender: modelSettings.gender || "female",
      body_type: modelSettings.bodyType ? 
        (modelSettings.bodyType < 33 ? "petite" : modelSettings.bodyType < 66 ? "average build" : "plus size") 
        : "average build",
      hairstyle: modelSettings.hairstyle ? modelSettings.hairstyle.replace("-", " ") : "long straight",
      height: modelSettings.height ? formatHeight(modelSettings.height) : "5'6\"",
      skin_tone: modelSettings.skinTone || "#D2B48C",
      background:
        backgroundType === "studio" ? "clean white studio background for e-commerce" : "natural lifestyle environment",
      lighting:
        `with ${brightness > 60 ? "bright" : brightness < 40 ? "soft" : "balanced"} lighting` +
        `${contrast > 60 ? " and high contrast" : contrast < 40 ? " and low contrast" : ""}`,
    }

    console.log("values:", values)

    // Add product-specific name if available
    if (productFieldName && productSpecificName) {
      values[productFieldName] = productSpecificName || productName
    }

    // Fill the template with values
    const filled = fillPromptTemplate(currentTemplate, values)
    console.log("filled prompt:", filled)
    setPreviewPrompt(filled)

    // Notify parent component
    onPromptChange(
      filled,
      isCustomizing ? customNegativePrompt : promptTemplates.find((t) => t.id === selectedTemplateId)?.negativePrompt,
    )
  }

  // Update the preview prompt when template or settings change
  useEffect(() => {
    console.log("useEffect triggered")
    console.log("modelSettings:", modelSettings)
    if (modelSettings) {
      console.log("Calling updatePreviewPrompt")
      updatePreviewPrompt()
    }
  }, [
    modelSettings,
    backgroundType,
    brightness,
    contrast,
    productSpecificName,
    selectedTemplateId,
    customPrompt,
    customNegativePrompt,
    isCustomizing,
    selectedProductTypeId,
    productName
  ])

  // Handle product type detection
  const handleProductTypeDetected = (productType: ProductType, suggestedName: string) => {
    if (onProductTypeDetected) {
      onProductTypeDetected(productType, suggestedName)
    }
  }
  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    const template = promptTemplates.find((t) => t.id === templateId)
    if (template) {
      setSelectedTemplateId(templateId)
      setCustomPrompt(template.template)
      setCustomNegativePrompt(template.negativePrompt || "")
      setIsCustomizing(false)
    }
  }
  // Handle resetting to the selected template
  const handleResetToTemplate = () => {
    const template = promptTemplates.find((t) => t.id === selectedTemplateId)
    if (template) {
      setCustomPrompt(template.template)
      setCustomNegativePrompt(template.negativePrompt || "")
      setIsCustomizing(false)
      setChildTab("templates")
    }
  }

  // Handle customizing the template
  const handleCustomizeTemplate = () => {
    setIsCustomizing(true)
    setChildTab("custom")
  }

  // Copy prompt to clipboard
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(previewPrompt)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2" style={{ display: 'flex', alignItems: 'space-around', justifyContent: 'space-around' }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl  text-left bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
              Select Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="generate" onValueChange={(value) => setParentTab(value as "generate" | "upload" | "gallery")}>
              <TabsList className="mb-4">
                <TabsTrigger value="generate">Generate New</TabsTrigger>
                <TabsTrigger value="upload">Upload Existing</TabsTrigger>
                <TabsTrigger value="gallery">Gallery</TabsTrigger>
              </TabsList>

              <TabsContent value="generate" className="space-y-4">
                <Tabs defaultValue="templates" onValueChange={(value) => setChildTab(value as "templates" | "custom")}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="custom">Custom Prompt</TabsTrigger>
                  </TabsList>

                  <TabsContent value="templates" className="space-y-4">
                    <ScrollArea className="h-[200px] rounded-md border p-2">
                      <div className="space-y-2">
                        {getTemplatesForProductType(selectedProductTypeId).map((template) => (
                          <div
                            key={template.id}
                            className={`p-1 rounded-md cursor-pointer transition-colors ${
                              selectedTemplateId === template.id
                                ? "bg-primary/10 border-primary border"
                                : "border hover:bg-accent"
                            }`}
                            onClick={() => handleTemplateChange(template.id)}
                          >
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">{template.name}</h4>
                              {template.isDefault && (
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Default</span>
                              )}
                            </div>
                            {template.description && (
                              <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <Button onClick={handleCustomizeTemplate} variant="outline" className="w-full">
                      <Wand2 className="h-4 w-4 mr-2" />
                      Customize This Template
                    </Button>

                    {/* Preview Prompt Section */}
                    <div className="mt-6 space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Preview Prompt</Label>
                        <Button variant="ghost" size="sm" onClick={handleCopyPrompt}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      <div className="p-3 bg-muted rounded-md text-sm">
                        <p className="whitespace-pre-wrap">{previewPrompt || "Select a template or customize your prompt to see the preview..."}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="custom" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="custom-prompt">Custom Prompt</Label>
                      <Textarea
                        id="custom-prompt"
                        placeholder="Enter your custom prompt template..."
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        className="min-h-[120px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use placeholders like {"{gender}"}, {"{body_type}"}, {"{background}"}, etc. for dynamic values.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="negative-prompt">Negative Prompt</Label>
                      <Textarea
                        id="negative-prompt"
                        placeholder="Enter negative prompt to avoid unwanted elements..."
                        value={customNegativePrompt}
                        onChange={(e) => setCustomNegativePrompt(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Negative prompts help avoid unwanted elements in the generated image.
                      </p>
                    </div>

                    {isCustomizing && (
                      <Button onClick={handleResetToTemplate} variant="outline" className="w-full">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset to Selected Template
                      </Button>
                    )}

                    {/* Preview Prompt Section */}
                    <div className="mt-6 space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Preview Prompt</Label>
                        <Button variant="ghost" size="sm" onClick={handleCopyPrompt}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      <div className="p-3 bg-muted rounded-md text-sm">
                        <p className="whitespace-pre-wrap">{previewPrompt || "Select a template or customize your prompt to see the preview..."}</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <div {...getRootProps()} className="cursor-pointer">
                    <input {...getInputProps()} />
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop your product image here, or click to select
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="gallery" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {uploadedImages.map((image) => (
                    <div
                      key={image.id}
                      className={`relative rounded-lg overflow-hidden border-2 ${
                        selectedImageId === image.id ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img
                        src={image.url}
                        alt="Uploaded product"
                        className="w-full h-32 object-cover"
                        onClick={() => setSelectedImageId(image.id)}
                      />
                      <button
                        className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
                        onClick={() => handleRemoveImage(image.id)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {uploadedImages.length > 0 && (
                  <Button variant="outline" onClick={handleRemoveAllImages} className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Gallery
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-left mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Select Garment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upload" onValueChange={(value) => setParentTab(value as "upload" | "gallery")}>
              <TabsList className="mb-4">
                <TabsTrigger value="upload">Upload Existing</TabsTrigger>
                <TabsTrigger value="gallery">Gallery</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <div {...getRootProps()} className="cursor-pointer">
                    <input {...getInputProps()} />
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop your product image here, or click to select
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="gallery" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {uploadedImages.map((image) => (
                    <div
                      key={image.id}
                      className={`relative rounded-lg overflow-hidden border-2 ${
                        selectedImageId === image.id ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img
                        src={image.url}
                        alt="Uploaded product"
                        className="w-full h-32 object-cover"
                        onClick={() => setSelectedImageId(image.id)}
                      />
                      <button
                        className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
                        onClick={() => handleRemoveImage(image.id)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {uploadedImages.length > 0 && (
                  <Button variant="outline" onClick={handleRemoveAllImages} className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Gallery
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-left mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upload" onValueChange={(value) => setParentTab(value as "upload" | "gallery")}>
              <TabsList className="mb-4">
                <TabsTrigger value="upload">Upload Existing</TabsTrigger>
                <TabsTrigger value="gallery">Gallery</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <div {...getRootProps()} className="cursor-pointer">
                    <input {...getInputProps()} />
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop your product image here, or click to select
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="gallery" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {uploadedImages.map((image) => (
                    <div
                      key={image.id}
                      className={`relative rounded-lg overflow-hidden border-2 ${
                        selectedImageId === image.id ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img
                        src={image.url}
                        alt="Uploaded product"
                        className="w-full h-32 object-cover"
                        onClick={() => setSelectedImageId(image.id)}
                      />
                      <button
                        className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
                        onClick={() => handleRemoveImage(image.id)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {uploadedImages.length > 0 && (
                  <Button variant="outline" onClick={handleRemoveAllImages} className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Gallery
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <div className="text-center text-sm text-muted-foreground">
          <p>For best results, use high-quality images of your products on a clean background.</p>
        </div>
    </div>
  )
}