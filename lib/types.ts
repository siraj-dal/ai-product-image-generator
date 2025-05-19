export interface ModelSettings {
  gender: "male" | "female" | "non-binary"
  bodyType: number // 0-100 scale (petite to plus size)
  skinTone: string // Hex color
  hairstyle: string
  height: number // Height in inches
}

export interface GenerateImageParams {
  productImage: string
  backgroundRemoved: boolean
  autoCrop: boolean
  modelSettings: ModelSettings
  resolution: "512x512" | "1024x1024"
  backgroundType: "studio" | "lifestyle"
  brightness: number
  contrast: number
  modelType?: string // Added model type parameter
  customPrompt?: string // Added custom prompt parameter
  negativePrompt?: string // Added negative prompt parameter
  productType?: string // Added product type parameter
}

export interface GenerateImageResult {
  imageUrl: string
  metadata: {
    processingTime: number
    aiModel: string
    prompt?: string
    negativePrompt?: string
  }
}

export interface StylePreset {
  id: string
  name: string
  description: string
  backgroundType: "studio" | "lifestyle"
  brightness: number
  contrast: number
  thumbnail: string
}

// Performance configuration for TensorFlow.js
export interface PerformanceConfig {
  useWebGL: boolean
  useWasm: boolean
  useWebGPU: boolean
  precision: "high" | "medium" | "low"
  memoryManagement: "aggressive" | "balanced" | "performance"
}
