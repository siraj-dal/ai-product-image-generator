"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAllProductCategories } from "@/lib/product-detection"
import { Camera, ImageIcon, Trash, Save, Plus, AlertCircle, CheckCircle } from "lucide-react"

interface TrainingImage {
  id: string
  dataUrl: string
  category: string
  label: string
}

export function ProductTypeTrainer() {
  const [trainingImages, setTrainingImages] = useState<TrainingImage[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [customLabel, setCustomLabel] = useState<string>("")
  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [modelName, setModelName] = useState("My Custom Model")
  const [activeTab, setActiveTab] = useState("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  // Get all product categories
  const productCategories = getAllProductCategories()

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = 300
      canvas.height = 300
    }

    // Clean up camera stream on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const reader = new FileReader()

      reader.onload = (event) => {
        if (event.target && event.target.result) {
          addTrainingImage(event.target.result as string)
        }
      }

      reader.readAsDataURL(file)
    }
  }

  // Add training image
  const addTrainingImage = (dataUrl: string) => {
    if (!selectedCategory) {
      setError("Please select a product category")
      return
    }

    const newImage: TrainingImage = {
      id: Date.now().toString(),
      dataUrl,
      category: selectedCategory,
      label: customLabel || selectedCategory,
    }

    setTrainingImages((prev) => [...prev, newImage])
    setError(null)
  }

  // Remove training image
  const removeTrainingImage = (id: string) => {
    setTrainingImages((prev) => prev.filter((img) => img.id !== id))
  }

  // Start camera
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 300, height: 300 },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setIsStreaming(true)
        streamRef.current = stream
      }
    } catch (err) {
      setError("Failed to access camera: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsStreaming(false)
  }

  // Capture image from camera
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return

    const context = canvasRef.current.getContext("2d")
    if (!context) return

    // Draw video frame to canvas
    context.drawImage(
      videoRef.current,
      0,
      0,
      videoRef.current.videoWidth,
      videoRef.current.videoHeight,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height,
    )

    // Get data URL from canvas
    const dataUrl = canvasRef.current.toDataURL("image/jpeg")

    // Add to training images
    addTrainingImage(dataUrl)
  }

  // Train model
  const trainModel = async () => {
    if (trainingImages.length < 5) {
      setError("Please add at least 5 training images")
      return
    }

    try {
      setIsTraining(true)
      setTrainingProgress(0)
      setError(null)

      // Simulate training progress
      const progressInterval = setInterval(() => {
        setTrainingProgress((prev) => {
          const newProgress = prev + 5
          return newProgress > 90 ? 90 : newProgress
        })
      }, 300)

      // In a real app, you would perform actual model training here
      // For this example, we'll just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 3000))

      clearInterval(progressInterval)
      setTrainingProgress(100)

      // Simulate successful training
      setTimeout(() => {
        setIsTraining(false)
        setSuccess("Model trained successfully! You can now save it.")
      }, 500)
    } catch (err) {
      setError("Failed to train model: " + (err instanceof Error ? err.message : String(err)))
      setIsTraining(false)
    }
  }

  // Save model
  const saveModel = async () => {
    if (!modelName.trim()) {
      setError("Please enter a model name")
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      // In a real app, you would save the trained model here
      // For this example, we'll just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setIsSaving(false)
      setSuccess(`Model "${modelName}" saved successfully!`)

      // Reset state after saving
      setTimeout(() => {
        setTrainingImages([])
        setCustomLabel("")
        setModelName("My Custom Model")
        setSuccess(null)
        setTrainingProgress(0)
      }, 2000)
    } catch (err) {
      setError("Failed to save model: " + (err instanceof Error ? err.message : String(err)))
      setIsSaving(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Product Type Trainer</CardTitle>
        <CardDescription>Train the system to recognize your specific product types</CardDescription>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Images</TabsTrigger>
          <TabsTrigger value="camera">Use Camera</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Product Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {productCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-label">Custom Label (Optional)</Label>
                  <Input
                    id="custom-label"
                    placeholder="E.g., Red Shoes"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image-upload">Upload Product Image</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={!selectedCategory}
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!selectedCategory}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Browse
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </TabsContent>

        <TabsContent value="camera">
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category-camera">Product Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {productCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-label-camera">Custom Label (Optional)</Label>
                  <Input
                    id="custom-label-camera"
                    placeholder="E.g., Red Shoes"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center space-y-4">
                <div className="relative w-[300px] h-[300px] bg-gray-100 rounded-md overflow-hidden">
                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover hidden" />
                </div>

                <div className="flex space-x-2">
                  {!isStreaming ? (
                    <Button onClick={startCamera} disabled={!selectedCategory}>
                      <Camera className="h-4 w-4 mr-2" />
                      Start Camera
                    </Button>
                  ) : (
                    <>
                      <Button onClick={captureImage} disabled={!selectedCategory}>
                        <Camera className="h-4 w-4 mr-2" />
                        Capture
                      </Button>
                      <Button variant="outline" onClick={stopCamera}>
                        Stop Camera
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>

      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="success">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Training Images ({trainingImages.length})</Label>
              {trainingImages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setTrainingImages([])}>
                  Clear All
                </Button>
              )}
            </div>

            {trainingImages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-md">
                No training images added yet. Add images to train the model.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {trainingImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <div className="aspect-square overflow-hidden rounded-md border">
                      <img
                        src={img.dataUrl || "/placeholder.svg"}
                        alt={img.label}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="absolute inset-0 flex flex-col justify-between p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6 self-end"
                        onClick={() => removeTrainingImage(img.id)}
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                      <Badge variant="secondary" className="text-xs">
                        {img.label}
                      </Badge>
                    </div>
                  </div>
                ))}
                <div
                  className="aspect-square flex items-center justify-center rounded-md border border-dashed cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => (activeTab === "upload" ? fileInputRef.current?.click() : setActiveTab("camera"))}
                >
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {isTraining && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Training model...</span>
                <span>{trainingProgress}%</span>
              </div>
              <Progress value={trainingProgress} className="w-full" />
            </div>
          )}

          {trainingProgress === 100 && !isTraining && (
            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                placeholder="Enter model name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                disabled={isSaving}
              />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setTrainingImages([])
            setCustomLabel("")
            setModelName("My Custom Model")
            setSuccess(null)
            setError(null)
            setTrainingProgress(0)
          }}
          disabled={isTraining || isSaving || trainingImages.length === 0}
        >
          Reset
        </Button>

        {trainingProgress === 100 && !isTraining ? (
          <Button onClick={saveModel} disabled={isSaving || !modelName.trim()}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Model"}
          </Button>
        ) : (
          <Button onClick={trainModel} disabled={isTraining || trainingImages.length < 5}>
            {isTraining ? "Training..." : "Train Model"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
