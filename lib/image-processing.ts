import * as tf from "@tensorflow/tfjs"
import "@tensorflow/tfjs-backend-webgl"
import * as bodyPix from "@tensorflow-models/body-pix"
import * as deeplab from "@tensorflow-models/deeplab"
import * as mobilenet from "@tensorflow-models/mobilenet"

// Model cache
interface ModelCache {
  bodyPix?: bodyPix.BodyPix
  deeplab?: deeplab.SemanticSegmentation
  mobilenet?: mobilenet.MobileNet
}

const modelCache: ModelCache = {}

// Performance configuration
export interface PerformanceConfig {
  useWebGL: boolean
  useWasm: boolean
  useWebGPU: boolean
  precision: "high" | "medium" | "low"
  memoryManagement: "aggressive" | "balanced" | "performance"
}

let performanceConfig: PerformanceConfig = {
  useWebGL: true,
  useWasm: false,
  useWebGPU: false,
  precision: "medium",
  memoryManagement: "balanced",
}

// Initialize TensorFlow.js with optimal settings
export async function initTensorFlow(config?: Partial<PerformanceConfig>): Promise<void> {
  // Update config with any provided options
  if (config) {
    performanceConfig = { ...performanceConfig, ...config }
  }

  // Configure TensorFlow.js
  if (performanceConfig.useWebGL) {
    // Check if backend is already registered to prevent duplicate registration
    if (!tf.findBackend("webgl")) {
      await tf.setBackend("webgl")
    }

    // Configure WebGL backend
    const gl = await (tf.backend() as any).getGPGPUContext().gl
    if (gl) {
      // Enable floating point textures
      const ext = gl.getExtension("OES_texture_float")
      const ext2 = gl.getExtension("WEBGL_color_buffer_float")

      // Set precision based on config
      if (performanceConfig.precision === "high") {
        tf.env().set("WEBGL_FORCE_F16_TEXTURES", false)
      } else if (performanceConfig.precision === "low") {
        tf.env().set("WEBGL_FORCE_F16_TEXTURES", true)
      }
    }
  } else if (performanceConfig.useWasm) {
    await tf.setBackend("wasm")
  } else if (performanceConfig.useWebGPU && (tf.backend() as any).getBackendName() === "webgpu") {
    await tf.setBackend("webgpu")
  }

  // Configure memory management
  if (performanceConfig.memoryManagement === "aggressive") {
    tf.env().set("WEBGL_DELETE_TEXTURE_THRESHOLD", 0) // Delete textures immediately
    tf.tidy(() => {}) // Force garbage collection
  } else if (performanceConfig.memoryManagement === "performance") {
    tf.env().set("WEBGL_DELETE_TEXTURE_THRESHOLD", 1000) // Keep more textures in memory
  }

  // Warm up the engine
  tf.tidy(() => {
    const warmupTensor = tf.zeros([1, 224, 224, 3])
    warmupTensor.dispose()
  })
}

// Model types
export type SegmentationModel = "bodypix" | "deeplab" | "mobilenet"

// Model loading with progress callback
export async function loadModel(
  modelType: SegmentationModel,
  progressCallback?: (progress: number, message: string) => void,
): Promise<any> {
  // Return cached model if available
  if (modelType === "bodypix" && modelCache.bodyPix) {
    return modelCache.bodyPix
  } else if (modelType === "deeplab" && modelCache.deeplab) {
    return modelCache.deeplab
  } else if (modelType === "mobilenet" && modelCache.mobilenet) {
    return modelCache.mobilenet
  }

  // Load the model
  try {
    progressCallback?.(0.1, `Loading ${modelType} model...`)

    if (modelType === "bodypix") {
      // Configure BodyPix based on performance settings
      const multiplier =
        performanceConfig.precision === "high" ? 1.0 : performanceConfig.precision === "medium" ? 0.75 : 0.5

      const outputStride =
        performanceConfig.precision === "high" ? 16 : performanceConfig.precision === "medium" ? 16 : 32

      progressCallback?.(0.3, "Initializing BodyPix model...")
      modelCache.bodyPix = await bodyPix.load({
        architecture: "MobileNetV1",
        outputStride,
        multiplier,
        quantBytes: performanceConfig.precision === "high" ? 4 : 2,
      })
      progressCallback?.(1.0, "BodyPix model loaded")
      return modelCache.bodyPix
    } else if (modelType === "deeplab") {
      progressCallback?.(0.3, "Initializing DeepLab model...")
      modelCache.deeplab = await deeplab.load({
        base: performanceConfig.precision === "high" ? "pascal" : "mobilenetv2",
        quantizationBytes: performanceConfig.precision === "high" ? 4 : 2,
      } as deeplab.ModelConfig)
      progressCallback?.(1.0, "DeepLab model loaded")
      return modelCache.deeplab
    } else if (modelType === "mobilenet") {
      progressCallback?.(0.3, "Initializing MobileNet model...")
      modelCache.mobilenet = await mobilenet.load({
        version: 2,
        alpha: performanceConfig.precision === "high" ? 1.0 : 0.5,
      })
      progressCallback?.(1.0, "MobileNet model loaded")
      return modelCache.mobilenet
    }

    throw new Error(`Unknown model type: ${modelType}`)
  } catch (error) {
    console.error(`Error loading ${modelType} model:`, error)
    throw new Error(`Failed to load ${modelType} model: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Function to remove background from an image using the specified model
export async function removeBackground(
  imageUrl: string,
  options: {
    modelType?: SegmentationModel
    backgroundBlur?: number
    edgeBlur?: number
    foregroundColor?: { r: number; g: number; b: number; a: number }
    backgroundColor?: { r: number; g: number; b: number; a: number }
    threshold?: number
    progressCallback?: (progress: number, message: string) => void
  } = {},
): Promise<string> {
  const {
    modelType = "bodypix",
    backgroundBlur = 0,
    edgeBlur = 3,
    foregroundColor = { r: 0, g: 0, b: 0, a: 0 }, // Transparent
    backgroundColor = { r: 255, g: 255, b: 255, a: 1 }, // White
    threshold = 0.7,
    progressCallback,
  } = options

  try {
    // Initialize TensorFlow if not already done
    progressCallback?.(0.1, "Initializing TensorFlow.js...")
    await initTensorFlow()

    // Load the model
    progressCallback?.(0.2, `Loading ${modelType} model...`)
    const model = await loadModel(modelType, progressCallback)

    // Create an image element from the URL
    progressCallback?.(0.5, "Processing image...")
    const img = new Image()
    img.crossOrigin = "anonymous"

    // Wait for the image to load
    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })
    } catch (error) {
      console.error("Error loading image:", error)
      throw new Error("Failed to load image: " + (error instanceof Error ? error.message : String(error)))
    }

    // Run segmentation based on the model type
    progressCallback?.(0.7, "Running segmentation...")
    let segmentation: any

    if (modelType === "bodypix") {
      segmentation = await (model as bodyPix.BodyPix).segmentPerson(img, {
        flipHorizontal: false,
        internalResolution: performanceConfig.precision === "high" ? "high" : "medium",
        segmentationThreshold: threshold,
      })
    } else if (modelType === "deeplab") {
      segmentation = await (model as deeplab.SemanticSegmentation).segment(img)
    } else if (modelType === "mobilenet") {
      // MobileNet doesn't do segmentation directly, so we'll use it for classification
      // and then use a simple threshold-based approach for segmentation
      const predictions = await (model as mobilenet.MobileNet).classify(img)

      // Create a canvas to analyze the image
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not get canvas context")

      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Create a simple segmentation mask based on color difference from edges
      const mask = new Uint8Array(img.width * img.height)

      // Get edge pixels
      const edgePixels = []
      for (let x = 0; x < img.width; x++) {
        edgePixels.push(imageData.data[(0 * img.width + x) * 4])
        edgePixels.push(imageData.data[((img.height - 1) * img.width + x) * 4])
      }
      for (let y = 0; y < img.height; y++) {
        edgePixels.push(imageData.data[(y * img.width + 0) * 4])
        edgePixels.push(imageData.data[(y * img.width + (img.width - 1)) * 4])
      }

      // Calculate average edge color
      const avgEdgeColor = edgePixels.reduce((sum, val) => sum + val, 0) / edgePixels.length

      // Create mask based on difference from edge color
      for (let i = 0; i < img.width * img.height; i++) {
        const r = imageData.data[i * 4]
        const g = imageData.data[i * 4 + 1]
        const b = imageData.data[i * 4 + 2]
        const colorDiff = Math.abs(r - avgEdgeColor) + Math.abs(g - avgEdgeColor) + Math.abs(b - avgEdgeColor)
        mask[i] = colorDiff > threshold * 255 ? 1 : 0
      }

      segmentation = { width: img.width, height: img.height, data: mask }
    }

    progressCallback?.(0.8, "Creating masked image...")

    // Create a canvas to draw the result
    const canvas = document.createElement("canvas")
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("Could not get canvas context")
    }

    // Draw the segmentation mask
    let mask
    if (modelType === "bodypix") {
      mask = bodyPix.toMask(segmentation, foregroundColor, backgroundColor, backgroundBlur, edgeBlur)
    } else if (modelType === "deeplab") {
      // Create a mask from DeepLab segmentation
      const coloredPartImage = new ImageData(segmentation.width, segmentation.height)
      let mask = new Uint8ClampedArray(segmentation.width * segmentation.height * 4)

      for (let i = 0; i < segmentation.height; i++) {
        for (let j = 0; j < segmentation.width; j++) {
          const n = i * segmentation.width + j
          const isForeground = segmentation.segmentationMap[n] !== 0 // 0 is background

          mask[n * 4] = isForeground ? foregroundColor.r : backgroundColor.r
          mask[n * 4 + 1] = isForeground ? foregroundColor.g : backgroundColor.g
          mask[n * 4 + 2] = isForeground ? foregroundColor.b : backgroundColor.b
          mask[n * 4 + 3] = isForeground ? foregroundColor.a * 255 : backgroundColor.a * 255
        }
      }

      coloredPartImage.data.set(mask)
      mask = coloredPartImage
    } else {
      // Create a mask from our custom segmentation
      const coloredPartImage = new ImageData(segmentation.width, segmentation.height)
      const maskData = new Uint8ClampedArray(segmentation.width * segmentation.height * 4)

      for (let i = 0; i < segmentation.data.length; i++) {
        const isForeground = segmentation.data[i] === 1

        maskData[i * 4] = isForeground ? foregroundColor.r : backgroundColor.r
        maskData[i * 4 + 1] = isForeground ? foregroundColor.g : backgroundColor.g
        maskData[i * 4 + 2] = isForeground ? foregroundColor.b : backgroundColor.b
        maskData[i * 4 + 3] = isForeground ? foregroundColor.a * 255 : backgroundColor.a * 255
      }

      coloredPartImage.data.set(maskData)
      mask = coloredPartImage
    }

    // Draw the original image
    ctx.drawImage(img, 0, 0)

    // Apply the mask to the image
    const maskCanvas = document.createElement("canvas")
    maskCanvas.width = mask.width
    maskCanvas.height = mask.height
    const maskCtx = maskCanvas.getContext("2d")

    if (!maskCtx) {
      throw new Error("Could not get mask canvas context")
    }

    // Put the mask on the canvas
    maskCtx.putImageData(mask, 0, 0)

    // Clear the original canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw the original image
    ctx.drawImage(img, 0, 0)

    // Set composite operation to use the mask
    ctx.globalCompositeOperation = "destination-in"

    // Draw the mask
    ctx.drawImage(maskCanvas, 0, 0)

    // Reset composite operation
    ctx.globalCompositeOperation = "source-over"

    // If we want a white background instead of transparency
    if (backgroundColor.a > 0) {
      // Create a new canvas for the final image with background
      const finalCanvas = document.createElement("canvas")
      finalCanvas.width = canvas.width
      finalCanvas.height = canvas.height
      const finalCtx = finalCanvas.getContext("2d")

      if (!finalCtx) {
        throw new Error("Could not get final canvas context")
      }

      // Fill with background color
      finalCtx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`
      finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height)

      // Draw the foreground image
      finalCtx.drawImage(canvas, 0, 0)

      progressCallback?.(1.0, "Background removal complete")

      // Return the data URL of the final canvas
      return finalCanvas.toDataURL("image/png")
    }

    progressCallback?.(1.0, "Background removal complete")

    // Return the data URL of the canvas
    return canvas.toDataURL("image/png")
  } catch (error) {
    console.error("Error removing background:", error)
    throw new Error("Failed to remove background from image")
  }
}

// Function to auto-crop an image to focus on the main subject
export async function autoCropImage(
  imageUrl: string,
  options: {
    modelType?: SegmentationModel
    padding?: number
    progressCallback?: (progress: number, message: string) => void
  } = {},
): Promise<string> {
  const { modelType = "bodypix", padding = 0.1, progressCallback } = options

  try {
    // Initialize TensorFlow if not already done
    progressCallback?.(0.1, "Initializing TensorFlow.js...")
    await initTensorFlow()

    // Load the model
    progressCallback?.(0.2, `Loading ${modelType} model...`)
    const model = await loadModel(modelType, progressCallback)

    // Create an image element from the URL
    progressCallback?.(0.5, "Processing image...")
    const img = new Image()
    img.crossOrigin = "anonymous"

    // Wait for the image to load
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = imageUrl
    })

    // Run segmentation based on the model type
    progressCallback?.(0.7, "Running segmentation...")
    let segmentation: any

    if (modelType === "bodypix") {
      segmentation = await (model as bodyPix.BodyPix).segmentPerson(img, {
        flipHorizontal: false,
        internalResolution: performanceConfig.precision === "high" ? "high" : "medium",
        segmentationThreshold: 0.7,
      })
    } else if (modelType === "deeplab") {
      segmentation = await (model as deeplab.SemanticSegmentation).segment(img)

      // Convert DeepLab segmentation to a format we can use
      const width = segmentation.width
      const height = segmentation.height
      const mask = new Uint8Array(width * height)

      for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
          const n = i * width + j
          mask[n] = segmentation.segmentationMap[n] !== 0 ? 1 : 0 // 0 is background
        }
      }

      segmentation = { width, height, data: mask }
    } else if (modelType === "mobilenet") {
      // Similar approach as in removeBackground for MobileNet
      const predictions = await (model as mobilenet.MobileNet).classify(img)

      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not get canvas context")

      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      const mask = new Uint8Array(img.width * img.height)

      const edgePixels = []
      for (let x = 0; x < img.width; x++) {
        edgePixels.push(imageData.data[(0 * img.width + x) * 4])
        edgePixels.push(imageData.data[((img.height - 1) * img.width + x) * 4])
      }
      for (let y = 0; y < img.height; y++) {
        edgePixels.push(imageData.data[(y * img.width + 0) * 4])
        edgePixels.push(imageData.data[(y * img.width + (img.width - 1)) * 4])
      }

      const avgEdgeColor = edgePixels.reduce((sum, val) => sum + val, 0) / edgePixels.length

      for (let i = 0; i < img.width * img.height; i++) {
        const r = imageData.data[i * 4]
        const g = imageData.data[i * 4 + 1]
        const b = imageData.data[i * 4 + 2]
        const colorDiff = Math.abs(r - avgEdgeColor) + Math.abs(g - avgEdgeColor) + Math.abs(b - avgEdgeColor)
        mask[i] = colorDiff > 0.7 * 255 ? 1 : 0
      }

      segmentation = { width: img.width, height: img.height, data: mask }
    }

    // Find the bounding box of the person/object
    progressCallback?.(0.8, "Calculating crop dimensions...")
    const width = segmentation.width
    const height = segmentation.height
    const mask = segmentation.data || segmentation.segmentationMap

    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0

    // Find the bounds of the person/object in the mask
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x
        if (mask && mask[i] === 1) {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    // Add padding (percentage of the dimensions)
    const paddingX = Math.floor((maxX - minX) * padding)
    const paddingY = Math.floor((maxY - minY) * padding)

    minX = Math.max(0, minX - paddingX)
    minY = Math.max(0, minY - paddingY)
    maxX = Math.min(width, maxX + paddingX)
    maxY = Math.min(height, maxY + paddingY)

    // Calculate crop dimensions
    const cropWidth = maxX - minX
    const cropHeight = maxY - minY

    // Create a canvas for the cropped image
    progressCallback?.(0.9, "Creating cropped image...")
    const canvas = document.createElement("canvas")
    canvas.width = cropWidth
    canvas.height = cropHeight
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("Could not get canvas context")
    }

    // Draw the cropped portion of the image
    ctx.drawImage(img, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

    progressCallback?.(1.0, "Auto-crop complete")

    // Return the data URL of the canvas
    return canvas.toDataURL("image/png")
  } catch (error) {
    console.error("Error auto-cropping image:", error)
    throw new Error("Failed to auto-crop image")
  }
}

// Main function to process an image with background removal and/or auto-cropping
export async function processImage(
  imageUrl: string,
  options: {
    removeBackground?: boolean
    autoCrop?: boolean
    backgroundColor?: { r: number; g: number; b: number; a: number }
    modelType?: SegmentationModel
    threshold?: number
    progressCallback?: (progress: number, message: string) => void
  },
): Promise<string> {
  const {
    removeBackground = false,
    autoCrop = false,
    backgroundColor = { r: 255, g: 255, b: 255, a: 1 },
    modelType = "bodypix",
    threshold = 0.7,
    progressCallback,
  } = options

  try {
    let processedImageUrl = imageUrl
    let currentProgress = 0

    // Apply auto-crop if requested
    if (autoCrop) {
      progressCallback?.(currentProgress, "Starting auto-crop...")
      processedImageUrl = await autoCropImage(processedImageUrl, {
        modelType,
        progressCallback: (progress, message) => {
          const scaledProgress = currentProgress + progress * 0.5
          progressCallback?.(scaledProgress, message)
        },
      })
      currentProgress = 0.5
    }

    // Apply background removal if requested
    if (removeBackground) {
      progressCallback?.(currentProgress, "Starting background removal...")
      processedImageUrl = await removeBackground(processedImageUrl, {
        modelType,
        backgroundColor,
        threshold,
        progressCallback: (progress, message) => {
          const scaledProgress = currentProgress + progress * (1 - currentProgress)
          progressCallback?.(scaledProgress, message)
        },
      })
    }

    progressCallback?.(1.0, "Processing complete")
    return processedImageUrl
  } catch (error) {
    console.error("Error processing image:", error)
    throw new Error("Failed to process image")
  }
}

// Function to get the current performance configuration
export function getPerformanceConfig(): PerformanceConfig {
  return { ...performanceConfig }
}

// Function to update the performance configuration
export function updatePerformanceConfig(config: Partial<PerformanceConfig>): void {
  performanceConfig = { ...performanceConfig, ...config }
}

// Function to clear the model cache
export function clearModelCache(): void {
  modelCache.bodyPix = undefined
  modelCache.deeplab = undefined
  modelCache.mobilenet = undefined
}

// Function to check if WebGL is available and get capabilities
export function checkWebGLCapabilities(): {
  webGLAvailable: boolean
  webGL2Available: boolean
  maxTextureSize: number
  extensions: string[]
} {
  try {
    const canvas = document.createElement("canvas")
    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext

    if (!gl) {
      return {
        webGLAvailable: false,
        webGL2Available: false,
        maxTextureSize: 0,
        extensions: [],
      }
    }

    const webGL2 = canvas.getContext("webgl2") !== null
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    const extensions = gl.getSupportedExtensions() || []

    return {
      webGLAvailable: true,
      webGL2Available: webGL2,
      maxTextureSize,
      extensions,
    }
  } catch (e) {
    return {
      webGLAvailable: false,
      webGL2Available: false,
      maxTextureSize: 0,
      extensions: [],
    }
  }
}
