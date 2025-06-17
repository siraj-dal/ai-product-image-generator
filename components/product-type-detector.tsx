"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, Scan, AlertTriangle, Settings2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import {
  detectProductType,
  getProductNameSuggestion,
  isModelLoaded,
  preloadProductDetectionModel,
  getDetectionSettings,
  updateDetectionSettings,
} from "@/lib/product-detection"
import { getProductTypeById } from "@/lib/prompt-templates"
import type { ProductDetectionResult } from "@/lib/product-detection"
import type { ProductType } from "@/lib/prompt-templates"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface ProductTypeDetectorProps {
  imageUrl: string | null
  onProductTypeDetected: (productType: ProductType, suggestedName: string) => void
  isVisible?: boolean
}

export function ProductTypeDetector({ imageUrl, onProductTypeDetected, isVisible = true }: ProductTypeDetectorProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionResult, setDetectionResult] = useState<ProductDetectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0)
  const [isModelReady, setIsModelReady] = useState(isModelLoaded())
  const [suggestedName, setSuggestedName] = useState("")
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [confidenceThreshold, setConfidenceThreshold] = useState(getDetectionSettings().confidenceThreshold * 100)
  const [isOffline, setIsOffline] = useState(false)

  // Check if model is loaded on mount
  useEffect(() => {
    if (!isModelReady) {
      // Start loading the model
      let progressInterval: NodeJS.Timeout

      const loadModel = async () => {
        try {
          // Simulate progress while loading
          progressInterval = setInterval(() => {
            setModelLoadingProgress((prev) => {
              const newProgress = prev + (100 - prev) * 0.1
              return Math.min(newProgress, 95) // Cap at 95% until actually loaded
            })
          }, 300)

          // Check if we're offline
          setIsOffline(!navigator.onLine)

          // Actually load the model
          await preloadProductDetectionModel()
          setIsModelReady(true)
          setModelLoadingProgress(100)

          // If auto-detect is enabled and we have an image, detect immediately
          if (autoDetectEnabled && imageUrl) {
            detectProductTypeFromImage(imageUrl)
          }
        } catch (err) {
          setError("Failed to load product detection model")
          console.error("Error loading model:", err)
          setModelLoadingProgress(0) // Reset progress on error

          // Show error state but don't block the UI
          setIsModelReady(false)
        } finally {
          clearInterval(progressInterval)
        }
      }

      loadModel()

      return () => {
        clearInterval(progressInterval)
      }
    } else if (autoDetectEnabled && imageUrl && isVisible) {
      // If model is already loaded and we have a new image, detect immediately
      detectProductTypeFromImage(imageUrl)
    }
  }, [imageUrl, isModelReady, autoDetectEnabled, isVisible])

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Function to detect product type from image
  const detectProductTypeFromImage = async (url: string) => {
    if (!url) return

    setIsDetecting(true)
    setError(null)

    try {
      const result = await detectProductType(url)
      setDetectionResult(result)

      // Get product name suggestion
      const nameSuggestion = getProductNameSuggestion(result.detectedLabels)
      setSuggestedName(nameSuggestion)

      // Get the detected product type
      const detectedProductType = getProductTypeById(result.productTypeId)

      // Notify parent component if we have a valid product type
      if (detectedProductType) {
        onProductTypeDetected(detectedProductType, nameSuggestion)
      }
    } catch (err) {
      console.error("Error detecting product type:", err)
      setError("Failed to detect product type")
    } finally {
      setIsDetecting(false)
    }
  }

  // Handle manual detection
  const handleManualDetection = () => {
    if (imageUrl) {
      detectProductTypeFromImage(imageUrl)
    }
  }

  // Handle selecting an alternative product type
  const handleSelectAlternative = (productTypeId: string) => {
    const productType = getProductTypeById(productTypeId)
    if (productType) {
      onProductTypeDetected(productType, suggestedName)
    }
  }

  // Handle confidence threshold change
  const handleConfidenceThresholdChange = (value: number[]) => {
    const threshold = value[0]
    setConfidenceThreshold(threshold)
    updateDetectionSettings({ confidenceThreshold: threshold / 100 })
  }

  // If component is not visible, don't render anything
  if (!isVisible) return null

  // If no image is provided, show a message
  if (!imageUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Type Detection</CardTitle>
          <CardDescription>Upload an image to detect the product type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 text-muted-foreground">
            <p>No image uploaded yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Scan className="mr-2 h-5 w-5" />
            Product Type Detection
          </CardTitle>
          
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Detection Settings</DialogTitle>
                <DialogDescription>
                  Adjust settings for product type detection
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Confidence Threshold</Label>
                    <span className="text-sm text-muted-foreground">{confidenceThreshold}%</span>
                  </div>
                  <Slider
                    value={[confidenceThreshold]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={handleConfidenceThresholdChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Adjust the minimum confidence threshold for product type detection. Higher values require more certainty.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-detect">Auto-detect</Label>
                    <input
                      type="checkbox"
                      id="auto-detect"
                      checked={autoDetectEnabled}
                      onChange={(e) => setAutoDetectEnabled(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Automatically detect product type when an image is uploaded
                  </p>
                </div>
                
                <div className="bg-muted p-3 rounded-md">
                  <h4 className="text-sm font-medium mb-1">Detection Status</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant={isModelReady ? "default" : "outline"}>
                      {isModelReady ? "Model Loaded" : "Model Not Loaded"}
                    </Badge>
                    <Badge variant={isOffline ? "destructive" : "outline"}>
                      {isOffline ? "Offline" : "Online"}
                    </Badge>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>Automatically detect the type of product in your image</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isModelReady ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Loading detection model...</span>
                <span>{Math.round(modelLoadingProgress)}%</span>
              </div>
              <Progress value={modelLoadingProgress} />
              <p className="text-xs text-muted-foreground">This may take a moment to download the first time</p>
            </div>

            {error && (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Model Loading Issue</AlertTitle>
                <AlertDescription>
                  <p>{error}</p>
                  <p className="text-xs mt-1">
                    You can still use the app, but automatic product detection won't be available.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setError(null)
                      setModelLoadingProgress(0)
                      preloadProductDetectionModel()
                        .then(() => {
                          setIsModelReady(true)
                          setModelLoadingProgress(100)
                        })
                        .catch((err) => {
                          setError("Failed to load model. Please try again later.")
                          console.error("Error reloading model:", err)
                        })
                    }}
                  >
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : isDetecting ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-center">Analyzing your product image...</p>
            <p className="text-sm text-muted-foreground text-center mt-1">This will only take a few seconds</p>
          </div>
        ) : detectionResult ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <h3 className="font-medium">Detected Product Type</h3>
                <div className="flex items-center mt-1">
                  {getProductTypeById(detectionResult.productTypeId) ? (
                    <>
                      <Badge variant="outline" className="mr-2">
                        {getProductTypeById(detectionResult.productTypeId)?.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(detectionResult.confidence * 100)}% confidence
                      </span>
                    </>
                  ) : (
                    <Badge variant="outline" className="mr-2">Unknown Type</Badge>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleManualDetection}>
                Detect Again
              </Button>
            </div>
            
            {detectionResult.alternativeTypes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Alternative Types</h4>
                <div className="flex flex-wrap gap-2">
                  {detectionResult.alternativeTypes.map((alt) => (
                    <Badge 
                      key={alt.productTypeId}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleSelectAlternative(alt.productTypeId)}
                    >
                      {getProductTypeById(alt.productTypeId)?.name || "Unknown"}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {Math.round(alt.confidence * 100)}%
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                Detected labels: {detectionResult.detectedLabels.slice(0, 3).join(", ")}
                {detectionResult.detectedLabels.length > 3 && " and more"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6">
            <Button onClick={handleManualDetection} className="mb-2">
              Detect Product Type
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Click to automatically detect the type of product in your image
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
