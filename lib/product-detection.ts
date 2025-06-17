import * as tf from "@tensorflow/tfjs"
import {
  loadModel,
  modelExists,
  cacheDefaultMobileNetModel,
  getCachedImageNetClasses,
  loadImageNetClasses,
  cacheImageNetClasses,
  isOnline,
} from "./model-management"

// Define the mapping between MobileNet classifications and our product types
const productTypeMapping: Record<string, string> = {
  // Clothing
  "jersey, T-shirt, tee shirt": "clothing",
  sweatshirt: "clothing",
  cardigan: "clothing",
  dress: "clothing",
  gown: "clothing",
  "hoody, hoodie": "clothing",
  jacket: "clothing",
  "jean, blue jean, denim": "clothing",
  "miniskirt, mini": "clothing",
  "pajama, pyjama, pj's, jammies": "clothing",
  poncho: "clothing",
  "suit, suit of clothes": "clothing",
  "sweater, jumper": "clothing",
  "trench coat": "clothing",
  "vest, waistcoat": "clothing",
  "bow tie, bow-tie, bowtie": "clothing",
  "brassiere, bra, bandeau": "clothing",
  hat: "clothing",
  cap: "clothing",
  shirt: "clothing",
  blouse: "clothing",
  pants: "clothing",
  trousers: "clothing",
  shorts: "clothing",
  skirt: "clothing",
  coat: "clothing",
  uniform: "clothing",
  kimono: "clothing",
  sock: "clothing",
  glove: "clothing",
  scarf: "clothing",
  tie: "clothing",

  // Footwear
  "running shoe": "footwear",
  sandal: "footwear",
  loafer: "footwear",
  shoe: "footwear",
  boot: "footwear",
  "ankle boot": "footwear",
  "high heel": "footwear",
  sneaker: "footwear",
  slipper: "footwear",
  "flip-flop": "footwear",
  clog: "footwear",

  // Accessories
  "sunglasses, dark glasses, shades": "accessories",
  "watch, ticker, timepiece": "accessories",
  purse: "accessories",
  "handbag, hand bag, pocketbook": "accessories",
  "wallet, billfold, notecase, pocketbook": "accessories",
  "backpack, back pack, knapsack, packsack": "accessories",
  suitcase: "accessories",
  necklace: "accessories",
  bracelet: "accessories",
  ring: "accessories",
  earring: "accessories",
  jewelry: "accessories",
  belt: "accessories",
  umbrella: "accessories",

  // Electronics
  "laptop, laptop computer": "electronics",
  "notebook, notebook computer": "electronics",
  "desktop computer": "electronics",
  monitor: "electronics",
  "cellular telephone, cellular phone, cellphone": "electronics",
  smartphone: "electronics",
  iPod: "electronics",
  tablet: "electronics",
  camera: "electronics",
  "digital camera": "electronics",
  "television, television system": "electronics",
  "TV, television, television set": "electronics",
  "remote control, remote": "electronics",
  printer: "electronics",
  keyboard: "electronics",
  "mouse, computer mouse": "electronics",
  headphone: "electronics",
  earphone: "electronics",
  speaker: "electronics",
  "microphone, mike": "electronics",

  // Home Goods
  "table lamp": "home",
  lamp: "home",
  chair: "home",
  table: "home",
  desk: "home",
  "sofa, couch, lounge": "home",
  bed: "home",
  pillow: "home",
  cushion: "home",
  vase: "home",
  bookshelf: "home",
  "wardrobe, closet, press": "home",
  "chest of drawers, chest, bureau, dresser": "home",
  "dining table, board": "home",
  "coffee table": "home",
  "refrigerator, icebox": "home",
  oven: "home",
  "microwave, microwave oven": "home",
  toaster: "home",
  "pot, flowerpot": "home",
  plate: "home",
  cup: "home",
  bowl: "home",
  "cutlery, eating utensil": "home",
  fork: "home",
  knife: "home",
  spoon: "home",
  "frying pan, frypan, skillet": "home",
  wok: "home",
  "kettle, boiler": "home",
  candle: "home",
  clock: "home",
  "curtain, drape, drapery, mantle, pall": "home",
  carpet: "home",
  rug: "home",

  // Beauty Products
  "perfume, essence": "beauty",
  lotion: "beauty",
  "lipstick, lip rouge": "beauty",
  "face powder": "beauty",
  "hair spray": "beauty",
  "cream, ointment, lotion": "beauty",
  soap: "beauty",
  shampoo: "beauty",
  "nail polish": "beauty",
  makeup: "beauty",
  cosmetics: "beauty",
  brush: "beauty",
  comb: "beauty",
  "hair dryer": "beauty",

  // Sports & Fitness
  dumbbell: "sports",
  barbell: "sports",
  "tennis ball": "sports",
  basketball: "sports",
  football: "sports",
  "soccer ball": "sports",
  baseball: "sports",
  "golf ball": "sports",
  "tennis racket": "sports",
  "racket, racquet": "sports",
  "baseball bat": "sports",
  "golf club": "sports",
  ski: "sports",
  snowboard: "sports",
  surfboard: "sports",
  skateboard: "sports",
  "bicycle, bike, wheel, cycle": "sports",
  treadmill: "sports",
  "weight, free weight, weight lifting": "sports",
  "gym equipment": "sports",
  "yoga mat": "sports",

  // Toys & Games
  toy: "toys",
  "teddy, teddy bear": "toys",
  "jigsaw puzzle": "toys",
  "game board": "toys",
  "chess, chess set": "toys",
  doll: "toys",
  "toy car": "toys",
  "toy truck": "toys",
  "toy train": "toys",
  "action figure": "toys",
  "building blocks": "toys",
  "playing card": "toys",
  "game controller": "toys",
  "video game": "toys",
  "board game": "toys",
  puzzle: "toys",
  ball: "toys",
  kite: "toys",
  frisbee: "toys",
}

// Interface for detection results
export interface ProductDetectionResult {
  productTypeId: string
  confidence: number
  detectedLabels: string[]
  alternativeTypes: Array<{
    productTypeId: string
    confidence: number
  }>
}

// Detection settings
export interface DetectionSettings {
  modelId?: string
  confidenceThreshold: number
  useCustomMapping?: boolean
  customMappingId?: string
}

// Default detection settings
const defaultDetectionSettings: DetectionSettings = {
  modelId: "default-mobilenet-v2",
  confidenceThreshold: 0.2,
  useCustomMapping: false,
}

// Current detection settings
let currentSettings: DetectionSettings = { ...defaultDetectionSettings }

// Update detection settings
export function updateDetectionSettings(settings: Partial<DetectionSettings>): DetectionSettings {
  currentSettings = { ...currentSettings, ...settings }
  return currentSettings
}

// Get current detection settings
export function getDetectionSettings(): DetectionSettings {
  return { ...currentSettings }
}

// Load model for detection
async function loadDetectionModel(): Promise<tf.LayersModel | tf.GraphModel> {
  const { modelId } = currentSettings

  // Check if the model exists in IndexedDB
  if (modelId && (await modelExists(modelId))) {
    return loadModel(modelId)
  }

  // If the default model doesn't exist, try to cache it
  if (modelId === "default-mobilenet-v2") {
    // Try to cache the default model
    const modelInfo = await cacheDefaultMobileNetModel()
    if (modelInfo) {
      return loadModel(modelId)
    }
  }

  // If we can't load the model from IndexedDB, load it directly
  try {
    const mobilenet = await import("@tensorflow-models/mobilenet")
    const model = await mobilenet.load({
      version: 2,
      alpha: 0.5,
    })
    return model
  } catch (error) {
    console.error("Error loading detection model:", error)
    throw new Error(`Failed to load detection model: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Get class names
async function getClassNames(): Promise<string[]> {
  // Try to get cached class names first
  const cachedClasses = getCachedImageNetClasses()
  if (cachedClasses) {
    return cachedClasses
  }

  // If we're online, try to fetch and cache the class names
  if (isOnline()) {
    try {
      const classes = await loadImageNetClasses()
      // Cache the classes for offline use
      cacheImageNetClasses()
      return classes
    } catch (error) {
      console.error("Error loading class names:", error)
    }
  }

  // If all else fails, return an empty array
  return []
}

// Get top K classes from the model output
async function getTopKClasses(
  logits: tf.Tensor,
  topK: number,
): Promise<Array<{ className: string; probability: number }>> {
  const values = await logits.data()

  // Get the indices of the top K values
  const valuesAndIndices = []
  for (let i = 0; i < values.length; i++) {
    valuesAndIndices.push({ value: values[i], index: i })
  }
  valuesAndIndices.sort((a, b) => b.value - a.value)
  const topkValues = valuesAndIndices.slice(0, topK)

  // Get the class names
  try {
    const imageNetClasses = await getClassNames()

    // Return the class names and probabilities
    return topkValues.map(({ value, index }) => ({
      className: imageNetClasses[index] || `class_${index}`,
      probability: value,
    }))
  } catch (error) {
    console.error("Error getting class names:", error)
    // Fallback to just returning indices if we can't load class names
    return topkValues.map(({ value, index }) => ({
      className: `class_${index}`,
      probability: value,
    }))
  }
}

// Detect product type from an image
export async function detectProductType(imageUrl: string): Promise<ProductDetectionResult> {
  try {
    // Load the model
    const model = await loadDetectionModel()

    // Load and preprocess the image
    const img = new Image()
    img.crossOrigin = "anonymous"

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = imageUrl
    })

    // Create a tensor from the image
    const tensor = tf.browser
      .fromPixels(img)
      .resizeBilinear([224, 224]) // Resize to model input size
      .toFloat()
      .expandDims(0)
      .div(127.5)
      .sub(1) // Normalize to [-1, 1]

    // Run inference
    const predictions = model.predict(tensor) as tf.Tensor

    // Get the top predictions
    const topPredictions = await getTopKClasses(predictions, 10)

    // Clean up tensors
    tensor.dispose()
    predictions.dispose()

    // Apply confidence threshold
    const { confidenceThreshold } = currentSettings
    const filteredPredictions = topPredictions.filter(
      (prediction) => prediction.probability >= confidenceThreshold
    )

    // Map the predictions to our product types
    const productTypeCounts: Record<string, { count: number; confidence: number }> = {}
    const detectedLabels: string[] = []

    for (const prediction of filteredPredictions) {
      detectedLabels.push(prediction.className)

      const mappedType = productTypeMapping[prediction.className]
      if (mappedType) {
        if (!productTypeCounts[mappedType]) {
          productTypeCounts[mappedType] = { count: 0, confidence: 0 }
        }
        productTypeCounts[mappedType].count += 1
        productTypeCounts[mappedType].confidence += prediction.probability
      }
    }

    // Find the most likely product type
    let bestTypeId = "custom" // Default to custom if no match
    let bestConfidence = 0
    const alternativeTypes: Array<{ productTypeId: string; confidence: number }> = []

    for (const [typeId, data] of Object.entries(productTypeCounts)) {
      const avgConfidence = data.confidence / data.count

      alternativeTypes.push({
        productTypeId: typeId,
        confidence: avgConfidence,
      })

      if (avgConfidence > bestConfidence) {
        bestTypeId = typeId
        bestConfidence = avgConfidence
      }
    }

    // Sort alternatives by confidence
    alternativeTypes.sort((a, b) => b.confidence - a.confidence)

    return {
      productTypeId: bestTypeId,
      confidence: bestConfidence,
      detectedLabels,
      alternativeTypes,
    }
  } catch (error) {
    console.error("Error detecting product type:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to detect product type: ${errorMessage}`)
  }
}

// Get product name suggestion based on detected labels
export function getProductNameSuggestion(labels: string[]): string {
  if (labels.length === 0) return ""
  
  // Use the first label as the base for the product name
  const baseLabel = labels[0].split(',')[0].trim()
  
  // Capitalize the first letter of each word
  return baseLabel
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Check if model is loaded
export async function isModelLoaded(): Promise<boolean> {
  return await modelExists("default-mobilenet-v2")
}

// Preload product detection model
export async function preloadProductDetectionModel(): Promise<void> {
  await cacheDefaultMobileNetModel()
}
