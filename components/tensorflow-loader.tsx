"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

export function TensorFlowLoader() {
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState("Initializing TensorFlow.js...")

  useEffect(() => {
    async function loadTensorFlow() {
      try {
        setProgress("Loading TensorFlow.js core...")
        const tf = await import("@tensorflow/tfjs")

        setProgress("Setting up WebGL backend...")
        await import("@tensorflow/tfjs-backend-webgl")
        await tf.setBackend("webgl")

        setProgress("Loading BodyPix model...")
        await import("@tensorflow-models/body-pix")

        setIsLoading(false)
      } catch (error) {
        console.error("Error loading TensorFlow:", error)
        setProgress("Error loading TensorFlow.js. Please refresh the page.")
      }
    }

    loadTensorFlow()
  }, [])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg font-medium">{progress}</p>
      <p className="text-sm text-muted-foreground mt-2">This may take a few moments on first load</p>
    </div>
  )
}
