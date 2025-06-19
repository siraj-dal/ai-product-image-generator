"use client"

import { useState, useEffect } from "react"
import { ModelCustomizationSidebar } from "@/components/model-customization-sidebar"
import { SceneEditor } from "@/components/scene-editor"
import { OutputControls } from "@/components/output-controls"
import { StylePresets } from "@/components/style-presets"
import { UploadSection } from "@/components/upload-section"
import { TryOnSection } from "@/components/tryon-section"
import { TensorFlowLoader } from "@/components/tensorflow-loader"
import { ModelTuningPanel } from "@/components/model-tuning-panel"
import { ImageComparison } from "@/components/image-comparison"
import { MobileOptimization } from "@/components/mobile-optimization"
import { UserPresets, type UserPreset } from "@/components/user-presets"
import { ExportOptions, type ExportOptions as ExportOptionsType } from "@/components/export-options"
import { ApiKeySettings } from "@/components/api-key-settings"
import { PromptEditor } from "@/components/prompt-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Layers, Smartphone, Wand2, Key, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateImage, IMAGE_GENERATION_MODELS } from "@/lib/api"
import { replaceBackground } from "@/lib/background-replacement"
import { getBackgroundPresets } from "@/lib/background-replacement"
import { preloadProductDetectionModel } from "@/lib/product-detection"
import type { ModelSettings, StylePreset } from "@/lib/types"
import type { SegmentationModel } from "@/lib/image-processing"
import type { BackgroundOptions } from "@/lib/background-replacement"
import type { ProductType } from "@/lib/prompt-templates"
import { string } from "@tensorflow/tfjs-core"

export default function ImageGenerator() {
  const { toast } = useToast()
  const [productImage, setProductImage] = useState<string | null>(null)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [backgroundRemoved, setBackgroundRemoved] = useState(false)
  const [autoCrop, setAutoCrop] = useState(true)
  const [activeTab, setActiveTab] = useState<
    "tryon" | "upload" | "editor" | "tuning" | "presets" | "export" | "settings" | "prompts"
  >("tryon")
  const [resolution, setResolution] = useState<"512x512" | "1024x1024">("512x512")
  const [backgroundType, setBackgroundType] = useState<"studio" | "lifestyle">("studio")
  const [brightness, setBrightness] = useState(50)
  const [contrast, setContrast] = useState(50)
  const [isTensorFlowLoaded, setIsTensorFlowLoaded] = useState(false)
  const [modelType, setModelType] = useState<SegmentationModel>("bodypix")
  const [showBackgroundOptions, setShowBackgroundOptions] = useState(false)
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundOptions>({
    type: "color",
    color: "#FFFFFF",
  })
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonFullWidth, setComparisonFullWidth] = useState(false)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [generationModel, setGenerationModel] = useState<string | null>(null)
  const [isApiKeyValid, setIsApiKeyValid] = useState(false)
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [customPrompt, setCustomPrompt] = useState<string>("")
  const [negativePrompt, setNegativePrompt] = useState<string>("")
  const [productType, setProductType] = useState<ProductType | null>(null)
  const [productName, setProductName] = useState<string>("")
  const [isProductDetectionModelLoaded, setIsProductDetectionModelLoaded] = useState(false)

  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    gender: "female",
    bodyType: 50,
    skinTone: "#D2B48C",
    hairstyle: "long-straight",
    height: 66, // 5'6"
  })

  // Check if we have a saved API key on component mount
  useEffect(() => {
    const savedKey = localStorage.getItem("huggingface_api_key")
    setIsApiKeyValid(!!savedKey)

    // If no API key is saved, show the API key dialog
    if (!savedKey) {
      // Show the dialog after a short delay to allow the UI to render first
      const timer = setTimeout(() => {
        setShowApiKeyDialog(true)
        toast({
          title: "API Key Required",
          description: "Please configure your Hugging Face API key to use all features.",
          variant: "default",
        })
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [])

  // Preload TensorFlow.js and product detection model in the background
  useEffect(() => {
    async function preloadModels() {
      try {
        // Dynamically import TensorFlow.js and related packages
        const tf = await import("@tensorflow/tfjs")
        await import("@tensorflow/tfjs-backend-webgl")
        
        // Check if backend is already registered to prevent duplicate registration
        if (!tf.findBackend("webgl")) {
          await tf.setBackend("webgl")
        }

        // Load BodyPix separately and handle errors
        try {
          await import("@tensorflow-models/body-pix")
          setIsTensorFlowLoaded(true)
        } catch (bodyPixError) {
          console.error("Error loading BodyPix model:", bodyPixError)
          // Still set TensorFlow as loaded since the core is working
          setIsTensorFlowLoaded(true)
        }

        // Try to preload product detection model, but don't block if it fails
        try {
          await preloadProductDetectionModel()
          setIsProductDetectionModelLoaded(true)
        } catch (detectionError) {
          console.error("Error preloading product detection model:", detectionError)
          // We'll handle this gracefully in the ProductTypeDetector component
        }
      } catch (error) {
        console.error("Error preloading TensorFlow:", error)
        // Core TensorFlow failed to load - this is more serious
        toast({
          title: "TensorFlow loading error",
          description: "Some features may not work properly. Please try refreshing the page.",
          variant: "destructive",
        })
      }
    }

    preloadModels()
  }, [])

  const handleUploadComplete = (imageUrl: string) => {
    setProductImage(imageUrl)
    setOriginalImage(imageUrl) // Save original for comparison
    setActiveTab("editor")
    toast({
      title: "Upload successful",
      description: "Your product image has been uploaded and processed.",
    })
  }

  const handleGenerate = async () => {
    if (!productImage) {
      toast({
        title: "No product image",
        description: "Please upload a product image first.",
        variant: "destructive",
      })
      return
    }

    // Check if we have a valid API key (unless using mock mode)
    if (generationModel !== IMAGE_GENERATION_MODELS.MOCK && !isApiKeyValid) {
      setShowApiKeyDialog(true)
      toast({
        title: "API key required",
        description: "Please configure your Hugging Face API key first.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      // First, check if we need to replace the background
      let processedImage = productImage

      if (showBackgroundOptions) {
        toast({
          title: "Processing background",
          description: "Replacing background before generating...",
        })

        processedImage = await replaceBackground(productImage, backgroundOptions, {
          modelType,
          progressCallback: (progress, message) => {
            // You could update UI with progress here
          },
        })
      }

      // Then generate the AI image
      const result = await generateImage({
        productImage: processedImage,
        backgroundRemoved,
        autoCrop,
        modelSettings,
        resolution,
        backgroundType,
        brightness,
        contrast,
        generationModel,
        customPrompt,
        negativePrompt,
        productType: productType?.id,
      })

      setGeneratedImage(result.imageUrl)

      // Show appropriate toast based on whether it's a mock or real generation
      if (result.metadata.aiModel === "Mock Generator" || result.metadata.aiModel === "Error") {
        toast({
          title: "Using mock generator",
          description: "The image was generated using the mock generator. Configure your API key for real generation.",
          variant: "warning",
        })
      } else {
        toast({
          title: "Generation complete",
          description: `Image generated in ${(result.metadata.processingTime / 1000).toFixed(1)}s using ${result.metadata.aiModel}.`,
        })
      }
    } catch (error) {
      console.error("Generation error:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "There was an error generating your image.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const applyStylePreset = (preset: StylePreset) => {
    setBackgroundType(preset.backgroundType)
    setBrightness(preset.brightness)
    setContrast(preset.contrast)

    toast({
      title: "Style applied",
      description: `Applied the ${preset.name} style.`,
    })
  }

  const applyBackgroundPreset = (preset: { id: string; name: string; options: BackgroundOptions }) => {
    setBackgroundOptions(preset.options)
    setShowBackgroundOptions(true)

    toast({
      title: "Background preset applied",
      description: `Applied the ${preset.name} background.`,
    })
  }

  const handleModelTuningComplete = () => {
    setActiveTab("editor")

    toast({
      title: "Settings applied",
      description: "Model tuning settings have been applied.",
    })
  }

  const handleMobileOptimizationComplete = () => {
    toast({
      title: "Optimization applied",
      description: "Mobile optimization settings have been applied.",
    })
  }

  const handleApiKeyValidated = (isValid: boolean) => {
    setIsApiKeyValid(isValid)
    if (isValid) {
      setShowApiKeyDialog(false)
      toast({
        title: "API key validated",
        description: "Your Hugging Face API key has been validated and saved. All features are now available.",
        variant: "success",
      })
    } else {
      // Keep dialog open but show a toast with guidance
      toast({
        title: "API key validation failed",
        description: "Please check your API key or try using the Mock Generator which doesn't require an API key.",
        variant: "destructive",
      })
    }
  }

  const handlePromptChange = (prompt: string, negative?: string) => {
    setCustomPrompt(prompt)
    if (negative) {
      setNegativePrompt(negative)
    }
  }

  const handleProductTypeChange = (type: ProductType) => {
    setProductType(type)
    // Update background type based on product type default
    setBackgroundType(type.defaultBackgroundType)

    // Switch to prompts tab to let user customize the prompt
    setActiveTab("prompts")

    toast({
      title: "Product type detected",
      description: `Detected product type: ${type.name}`,
    })
  }

  const handleProductTypeDetected = (type: ProductType, suggestedName: string) => {
    setProductType(type)
    setProductName(suggestedName)
    setBackgroundType(type.defaultBackgroundType)

    toast({
      title: "Product type detected",
      description: `Detected ${type.name}: ${suggestedName}`,
    })
  }

  const handleApplyPreset = (preset: UserPreset) => {
    // Apply all settings from the preset
    setModelSettings(preset.settings.modelSettings)
    setBackgroundOptions(preset.settings.backgroundOptions)
    setBackgroundRemoved(preset.settings.backgroundRemoved)
    setAutoCrop(preset.settings.autoCrop)
    setModelType(preset.settings.modelType)
    setBackgroundType(preset.settings.backgroundType)
    setBrightness(preset.settings.brightness)
    setContrast(preset.settings.contrast)
    setResolution(preset.settings.resolution)

    // Show background options if the preset uses them
    setShowBackgroundOptions(
      preset.settings.backgroundOptions.type !== "color" || preset.settings.backgroundOptions.color !== "#FFFFFF",
    )

    // Switch to editor tab
    setActiveTab("editor")

    toast({
      title: "Preset applied",
      description: `Applied the "${preset.name}" preset.`,
    })
  }

  const handleExport = async (options: ExportOptionsType): Promise<string> => {
    if (!generatedImage) {
      throw new Error("No image to export")
    }

    setIsExporting(true)

    try {
      // Create a canvas to process the image
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = generatedImage
      })

      const canvas = document.createElement("canvas")
      canvas.width = options.width
      canvas.height = options.height
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        throw new Error("Could not get canvas context")
      }

      // Draw the image with the specified dimensions
      ctx.drawImage(img, 0, 0, options.width, options.height)

      // Add metadata if requested
      if (options.includeMetadata) {
        // This is a simplified version - in a real app, you'd use proper metadata APIs
        const metadataText = `AI Product Image Generator | ${new Date().toISOString()}`
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
        ctx.fillRect(10, canvas.height - 30, ctx.measureText(metadataText).width + 20, 20)
        ctx.fillStyle = "#000000"
        ctx.font = "12px Arial"
        ctx.fillText(metadataText, 20, canvas.height - 15)
      }

      // Convert to the requested format with quality
      let mimeType = "image/png"
      let quality = 1.0

      if (options.format === "jpg") {
        mimeType = "image/jpeg"
        quality = options.quality / 100
      } else if (options.format === "webp") {
        mimeType = "image/webp"
        quality = options.quality / 100
      }

      // Get the data URL
      const dataUrl = canvas.toDataURL(mimeType, quality)

      return dataUrl
    } catch (error) {
      console.error("Export error:", error)
      throw error
    } finally {
      setIsExporting(false)
    }
  }

  // Get current settings for presets
  const getCurrentSettings = () => ({
    modelSettings,
    backgroundOptions,
    backgroundRemoved,
    autoCrop,
    modelType,
    backgroundType,
    brightness,
    contrast,
    resolution,
  })

  return (
    <div className="flex flex-col h-screen">
      {!isTensorFlowLoaded && <TensorFlowLoader />}

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Configure Hugging Face API Key</DialogTitle>
          </DialogHeader>
          <ApiKeySettings onApiKeyValidated={handleApiKeyValidated} />
        </DialogContent>
      </Dialog>

      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">AI Product Image Generator</h1>
          </div>

          <div className="flex items-center space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Wand2 className="h-4 w-4 mr-2" />
                  AI Model
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Select AI Model</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Available Models</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <div
                        className={`border rounded-md p-3 cursor-pointer hover:border-primary transition-colors ${generationModel === IMAGE_GENERATION_MODELS.STABLE_DIFFUSION_XL ? "border-primary bg-primary/10" : ""}`}
                        onClick={() => setGenerationModel(IMAGE_GENERATION_MODELS.STABLE_DIFFUSION_XL)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Stable Diffusion XL</p>
                            <p className="text-xs text-muted-foreground">
                              High quality general-purpose image generation
                            </p>
                          </div>
                          {generationModel === IMAGE_GENERATION_MODELS.STABLE_DIFFUSION_XL && (
                            <div className="h-3 w-3 rounded-full bg-primary"></div>
                          )}
                        </div>
                      </div>

                      <div
                        className={`border rounded-md p-3 cursor-pointer hover:border-primary transition-colors ${generationModel === IMAGE_GENERATION_MODELS.STABLE_DIFFUSION ? "border-primary bg-primary/10" : ""}`}
                        onClick={() => setGenerationModel(IMAGE_GENERATION_MODELS.STABLE_DIFFUSION)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Stable Diffusion 1.5</p>
                            <p className="text-xs text-muted-foreground">Faster generation with good quality</p>
                          </div>
                          {generationModel === IMAGE_GENERATION_MODELS.STABLE_DIFFUSION && (
                            <div className="h-3 w-3 rounded-full bg-primary"></div>
                          )}
                        </div>
                      </div>

                      <div
                        className={`border rounded-md p-3 cursor-pointer hover:border-primary transition-colors ${generationModel === IMAGE_GENERATION_MODELS.PIXART_ALPHA ? "border-primary bg-primary/10" : ""}`}
                        onClick={() => setGenerationModel(IMAGE_GENERATION_MODELS.PIXART_ALPHA)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">PixArt-Alpha</p>
                            <p className="text-xs text-muted-foreground">
                              Specialized for artistic and detailed images
                            </p>
                          </div>
                          {generationModel === IMAGE_GENERATION_MODELS.PIXART_ALPHA && (
                            <div className="h-3 w-3 rounded-full bg-primary"></div>
                          )}
                        </div>
                      </div>

                      <div
                        className={`border rounded-md p-3 cursor-pointer hover:border-primary transition-colors ${generationModel === IMAGE_GENERATION_MODELS.KANDINSKY ? "border-primary bg-primary/10" : ""}`}
                        onClick={() => setGenerationModel(IMAGE_GENERATION_MODELS.KANDINSKY)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Kandinsky</p>
                            <p className="text-xs text-muted-foreground">Russian model with unique artistic style</p>
                          </div>
                          {generationModel === IMAGE_GENERATION_MODELS.KANDINSKY && (
                            <div className="h-3 w-3 rounded-full bg-primary"></div>
                          )}
                        </div>
                      </div>

                      <div
                        className={`border rounded-md p-3 cursor-pointer hover:border-primary transition-colors ${generationModel === IMAGE_GENERATION_MODELS.MOCK ? "border-primary bg-primary/10" : "border-green-200 bg-green-50"}`}
                        onClick={() => setGenerationModel(IMAGE_GENERATION_MODELS.MOCK)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center">
                              <p className="font-medium">Mock Generator</p>
                              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">No API Key Required</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Works without Hugging Face API key - perfect for testing</p>
                          </div>
                          {generationModel === IMAGE_GENERATION_MODELS.MOCK && (
                            <div className="h-3 w-3 rounded-full bg-primary"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={() => setActiveTab("prompts")}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Prompts
            </Button>
            

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Layers className="h-4 w-4 mr-2" />
                  Background Options
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Background Options</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Background Presets</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {getBackgroundPresets().map((preset) => (
                        <div
                          key={preset.id}
                          className="border rounded-md p-2 cursor-pointer hover:border-primary transition-colors"
                          onClick={() => applyBackgroundPreset(preset)}
                        >
                          <div className="aspect-square w-full rounded-md overflow-hidden mb-2">
                            <img
                              src={preset.thumbnail || "/placeholder.svg"}
                              alt={preset.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-xs font-medium text-center">{preset.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Use Custom Background</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBackgroundOptions(!showBackgroundOptions)}
                    >
                      {showBackgroundOptions ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant={isApiKeyValid ? "outline" : "default"} 
              size="sm" 
              onClick={() => setShowApiKeyDialog(true)}
              className={isApiKeyValid ? "border-green-500 text-green-600" : "bg-amber-500 hover:bg-amber-600"}
            >
              <Key className={`h-4 w-4 mr-2 ${isApiKeyValid ? "text-green-600" : ""}`} />
              {isApiKeyValid ? "API Key (Valid)" : "Set API Key"}
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile Optimization
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Mobile Optimization</DialogTitle>
                </DialogHeader>
                <MobileOptimization onSettingsChange={handleMobileOptimizationComplete} />
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={() => setActiveTab("tuning")}>
              <Settings className="h-4 w-4 mr-2" />
              Advanced Settings
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ModelCustomizationSidebar settings={modelSettings} onSettingsChange={setModelSettings} />

        <main className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="container py-4">
            <TabsList>
            <TabsTrigger value="tryon">Try On</TabsTrigger>
              <TabsTrigger value="upload">Upload Product</TabsTrigger>
              <TabsTrigger value="editor" disabled={!productImage}>
                Scene Editor
              </TabsTrigger>
              <TabsTrigger value="prompts">Prompt Templates</TabsTrigger>
              <TabsTrigger value="tuning">Model Tuning</TabsTrigger>
              <TabsTrigger value="presets">User Presets</TabsTrigger>
              <TabsTrigger value="export" disabled={!generatedImage}>
                Export
              </TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="tryon" className="mt-4">
              <TryOnSection
                onUploadComplete={handleUploadComplete}
                backgroundRemoved={backgroundRemoved}
                setBackgroundRemoved={setBackgroundRemoved}
                autoCrop={autoCrop}
                setAutoCrop={setAutoCrop}
                modelType={generationModel}
                modelSettings={modelSettings}
                onPromptChange={handlePromptChange}
                productName={productName}
                backgroundType={backgroundType}
                brightness={brightness}
                contrast={contrast}
              />
            </TabsContent>
            
            <TabsContent value="upload" className="mt-4">
              <UploadSection
                onUploadComplete={handleUploadComplete}
                backgroundRemoved={backgroundRemoved}
                setBackgroundRemoved={setBackgroundRemoved}
                autoCrop={autoCrop}
                setAutoCrop={setAutoCrop}
                modelType={modelType}
                setModelType={setModelType}
                onProductTypeDetected={handleProductTypeDetected}
              />
            </TabsContent>

            <TabsContent value="editor" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                  <SceneEditor
                    productImage={productImage}
                    generatedImage={generatedImage}
                    isGenerating={isGenerating}
                    backgroundType={backgroundType}
                    setBackgroundType={setBackgroundType}
                    brightness={brightness}
                    setBrightness={setBrightness}
                    contrast={contrast}
                    setContrast={setContrast}
                  />

                  {generatedImage && originalImage && (
                    <div className="mt-4 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => setShowComparison(!showComparison)}>
                        {showComparison ? "Hide Comparison" : "Show Before/After"}
                      </Button>
                    </div>
                  )}

                  {showComparison && generatedImage && originalImage && (
                    <div className="mt-4">
                      <ImageComparison
                        beforeImage={originalImage}
                        afterImage={generatedImage}
                        fullWidth={comparisonFullWidth}
                        onToggleFullWidth={() => setComparisonFullWidth(!comparisonFullWidth)}
                      />
                    </div>
                  )}
                </div>
                <div className="lg:col-span-1">
                  <StylePresets onSelectPreset={applyStylePreset} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="prompts" className="mt-4">
              <PromptEditor
                modelSettings={modelSettings}
                backgroundType={backgroundType}
                brightness={brightness}
                contrast={contrast}
                productName={productName}
                onPromptChange={handlePromptChange}
                onProductTypeChange={handleProductTypeChange}
              />
            </TabsContent>

            <TabsContent value="tuning" className="mt-4">
              <ModelTuningPanel modelType={modelType} setModelType={setModelType} onSave={handleModelTuningComplete} />
            </TabsContent>

            <TabsContent value="presets" className="mt-4">
              <UserPresets currentSettings={getCurrentSettings()} onApplyPreset={handleApplyPreset} />
            </TabsContent>

            <TabsContent value="export" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Card className="w-full h-full flex flex-col">
                    <CardContent className="p-4 flex-1 flex items-center justify-center">
                      {generatedImage ? (
                        <img
                          src={generatedImage || "/placeholder.svg"}
                          alt="Generated product"
                          className="max-w-full max-h-[500px] object-contain rounded-md"
                        />
                      ) : (
                        <div className="text-center p-8 text-muted-foreground">No image generated yet</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <ExportOptions imageUrl={generatedImage} onExport={handleExport} isExporting={isExporting} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ApiKeySettings onApiKeyValidated={handleApiKeyValidated} />

                <Card>
                  <CardHeader>
                    <CardTitle>About Open-Source Models</CardTitle>
                    <CardDescription>Information about the available AI models for image generation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">Stable Diffusion XL</h3>
                      <p className="text-sm text-muted-foreground">
                        The latest version of Stable Diffusion with improved image quality and better understanding of
                        prompts. Best for high-quality, photorealistic product images.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium">Stable Diffusion 1.5</h3>
                      <p className="text-sm text-muted-foreground">
                        A faster version that requires less computing resources. Good for quick iterations and testing.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium">PixArt-Alpha</h3>
                      <p className="text-sm text-muted-foreground">
                        Specialized for artistic and detailed images with unique styles. Good for creative product
                        shots.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium">Kandinsky</h3>
                      <p className="text-sm text-muted-foreground">
                        A Russian model with a unique artistic style. Good for stylized and artistic product images.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium">Mock Generator</h3>
                      <p className="text-sm text-muted-foreground">
                        For testing without API calls. Useful for UI development and testing without using API credits.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <Separator />

      <OutputControls
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        resolution={resolution}
        setResolution={setResolution}
        generatedImage={generatedImage}
        disabled={!productImage}
      />
    </div>
  )
}
