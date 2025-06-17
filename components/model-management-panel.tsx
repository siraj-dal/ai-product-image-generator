"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getAllModelInfo, deleteModel, registerNetworkListeners } from "@/lib/model-management"
import { AlertCircle, Cloud, HardDrive, Upload, Wifi, WifiOff } from "lucide-react"

interface ModelInfo {
  id: string
  name: string
  description?: string
  dateAdded: Date
  lastUsed?: Date
  size?: number
  isCustom: boolean
  isDefault: boolean
}

export function ModelManagementPanel() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [modelName, setModelName] = useState("")
  const [modelDescription, setModelDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">(
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline",
  )
  const [serviceWorkerRegistered, setServiceWorkerRegistered] = useState(false)

  // Load models on component mount
  useEffect(() => {
    loadModels()
    initServiceWorker()

    // Register network status listeners
    const cleanup = registerNetworkListeners({
      onOnline: () => setNetworkStatus("online"),
      onOffline: () => setNetworkStatus("offline"),
    })

    return cleanup
  }, [])

  // Initialize service worker
  const initServiceWorker = async () => {
    const registered = await registerServiceWorker()
    setServiceWorkerRegistered(registered)
  }

  // Load all models from IndexedDB
  const loadModels = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const modelInfoList = await getAllModelInfo()
      setModels(modelInfoList)
    } catch (err) {
      setError("Failed to load models: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  // Handle model upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload")
      return
    }

    if (!modelName.trim()) {
      setError("Please enter a model name")
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)
      setError(null)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5
          return newProgress > 90 ? 90 : newProgress
        })
      }, 200)

      // In a real app, you would process and validate the model file here
      // For this example, we'll just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Simulate successful upload
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        setSelectedFile(null)
        setModelName("")
        setModelDescription("")

        // Refresh model list
        loadModels()
      }, 500)
    } catch (err) {
      setError("Failed to upload model: " + (err instanceof Error ? err.message : String(err)))
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Handle model deletion
  const handleDeleteModel = async (modelId: string) => {
    try {
      const success = await deleteModel(modelId)

      if (success) {
        // Refresh model list
        loadModels()
      } else {
        setError("Failed to delete model")
      }
    } catch (err) {
      setError("Error deleting model: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Get model status
  const modelStatus = getModelStatus()

  const handleTryOn = (modelId: string) => {
    // Logic to handle the Try-on button click
    console.log("Try-on clicked for model:", modelId)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Model Management</span>
          <Badge variant={networkStatus === "online" ? "default" : "destructive"} className="ml-2">
            {networkStatus === "online" ? (
              <>
                <Wifi className="h-3 w-3 mr-1" /> Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" /> Offline
              </>
            )}
          </Badge>
        </CardTitle>
        <CardDescription>Manage detection models and offline capabilities</CardDescription>
      </CardHeader>

      <Tabs defaultValue="models">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="upload">Upload Model</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="models">
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Progress value={undefined} className="w-full" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : models.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No models found. Upload a model or use the default model.
              </div>
            ) : (
              <div className="space-y-4">
                {models.map((model) => (
                  <div key={model.id} className="flex items-center justify-between border p-3 rounded-md">
                    <div>
                      <div className="font-medium flex items-center">
                        {model.name}
                        {model.isDefault && (
                          <Badge variant="outline" className="ml-2">
                            Default
                          </Badge>
                        )}
                        {model.isCustom && (
                          <Badge variant="outline" className="ml-2">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{model.description || "No description"}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Added: {new Date(model.dateAdded).toLocaleDateString()}
                        {model.lastUsed && ` • Last used: ${new Date(model.lastUsed).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={model.isDefault}
                        onClick={() => handleDeleteModel(model.id)}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTryOn(model.id)}
                      >
                        Try-on
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </TabsContent>

        <TabsContent value="upload">
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model-name">Model Name</Label>
                <Input
                  id="model-name"
                  placeholder="Enter model name"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-description">Description (Optional)</Label>
                <Textarea
                  id="model-description"
                  placeholder="Enter model description"
                  value={modelDescription}
                  onChange={(e) => setModelDescription(e.target.value)}
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-file">Model File</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="model-file"
                    type="file"
                    accept=".json,.bin,.pb"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: TensorFlow.js model files (.json, .bin, .pb)
                </p>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile || !modelName.trim()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Model
            </Button>
          </CardFooter>
        </TabsContent>

        <TabsContent value="settings">
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border p-3 rounded-md">
                <div>
                  <div className="font-medium">Offline Support</div>
                  <div className="text-sm text-muted-foreground">Enable offline detection with cached models</div>
                </div>
                <Badge variant={serviceWorkerRegistered ? "default" : "outline"}>
                  {serviceWorkerRegistered ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center justify-between border p-3 rounded-md">
                <div>
                  <div className="font-medium">Default Model</div>
                  <div className="text-sm text-muted-foreground">MobileNet model for product detection</div>
                </div>
                <Badge variant={modelStatus.isLoaded ? "default" : "outline"}>
                  {modelStatus.isLoaded ? "Loaded" : modelStatus.isLoading ? "Loading" : "Not Loaded"}
                </Badge>
              </div>

              <div className="flex items-center justify-between border p-3 rounded-md">
                <div>
                  <div className="font-medium">Storage Usage</div>
                  <div className="text-sm text-muted-foreground">Models and cached data</div>
                </div>
                <div className="text-sm">{models.length} model(s)</div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={loadModels}>
              <HardDrive className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={initServiceWorker} disabled={serviceWorkerRegistered}>
              <Cloud className="h-4 w-4 mr-2" />
              {serviceWorkerRegistered ? "Service Worker Registered" : "Register Service Worker"}
            </Button>
          </CardFooter>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
