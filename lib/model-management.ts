import * as tf from "@tensorflow/tfjs"
import { openDB, type IDBPDatabase } from "idb"

// Database name and version
const DB_NAME = "ai-product-image-generator"
const DB_VERSION = 1

// Store names
const MODEL_STORE = "models"
const MODEL_INFO_STORE = "model-info"
const CUSTOM_CLASSES_STORE = "custom-classes"

// Model types
export type ModelType = "mobilenet" | "custom" | "trained"

// Model info interface
export interface ModelInfo {
  id: string
  name: string
  type: ModelType
  createdAt: number
  lastUsed: number
  size: number
  description?: string
  classCount?: number
  accuracy?: number
  isDefault?: boolean
}

// Custom classes mapping
export interface CustomClassesMapping {
  id: string
  modelId: string
  mapping: Record<string, string>
  createdAt: number
  lastUsed: number
  name: string
}

// Database connection
let db: IDBPDatabase | null = null

// Initialize the database
async function initDB(): Promise<IDBPDatabase> {
  if (db) return db

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Create stores if they don't exist
      if (!database.objectStoreNames.contains(MODEL_STORE)) {
        database.createObjectStore(MODEL_STORE)
      }

      if (!database.objectStoreNames.contains(MODEL_INFO_STORE)) {
        const modelInfoStore = database.createObjectStore(MODEL_INFO_STORE, { keyPath: "id" })
        modelInfoStore.createIndex("type", "type")
        modelInfoStore.createIndex("lastUsed", "lastUsed")
      }

      if (!database.objectStoreNames.contains(CUSTOM_CLASSES_STORE)) {
        const customClassesStore = database.createObjectStore(CUSTOM_CLASSES_STORE, { keyPath: "id" })
        customClassesStore.createIndex("modelId", "modelId")
      }
    },
  })

  return db
}

// Save a model to IndexedDB
export async function saveModel(
  model: tf.LayersModel | tf.GraphModel,
  modelInfo: Omit<ModelInfo, "size" | "createdAt" | "lastUsed">,
): Promise<ModelInfo> {
  const database = await initDB()

  // Save the model using TensorFlow.js IO
  const modelArtifacts = await model.save(
    tf.io.withSaveHandler(async (artifacts) => {
      // Calculate the size of the model
      const modelSize = calculateModelSize(artifacts)

      // Create a complete model info object
      const completeModelInfo: ModelInfo = {
        ...modelInfo,
        size: modelSize,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      }

      // Store model artifacts and info
      const tx = database.transaction([MODEL_STORE, MODEL_INFO_STORE], "readwrite")
      await tx.objectStore(MODEL_STORE).put(artifacts, modelInfo.id)
      await tx.objectStore(MODEL_INFO_STORE).put(completeModelInfo)

      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: "JSON",
        },
      }
    }),
  )

  // Return the saved model info
  const savedModelInfo = await database.get(MODEL_INFO_STORE, modelInfo.id)
  return savedModelInfo
}

// Load a model from IndexedDB
export async function loadModel(modelId: string): Promise<tf.LayersModel | tf.GraphModel> {
  const database = await initDB()

  // Update last used timestamp
  const modelInfo = await database.get(MODEL_INFO_STORE, modelId)
  if (modelInfo) {
    modelInfo.lastUsed = Date.now()
    await database.put(MODEL_INFO_STORE, modelInfo)
  }

  // Load the model using TensorFlow.js IO
  const model = await tf.loadLayersModel(tf.io.fromMemory(await database.get(MODEL_STORE, modelId)))

  return model
}

// Delete a model from IndexedDB
export async function deleteModel(modelId: string): Promise<void> {
  const database = await initDB()

  const tx = database.transaction([MODEL_STORE, MODEL_INFO_STORE, CUSTOM_CLASSES_STORE], "readwrite")
  await tx.objectStore(MODEL_STORE).delete(modelId)
  await tx.objectStore(MODEL_INFO_STORE).delete(modelId)

  // Delete any associated custom classes
  const customClassesIndex = tx.objectStore(CUSTOM_CLASSES_STORE).index("modelId")
  const customClassesKeys = await customClassesIndex.getAllKeys(modelId)

  for (const key of customClassesKeys) {
    await tx.objectStore(CUSTOM_CLASSES_STORE).delete(key)
  }
}

// Get all model info
export async function getAllModelInfo(): Promise<ModelInfo[]> {
  const database = await initDB()
  return database.getAll(MODEL_INFO_STORE)
}

// Get model info by ID
export async function getModelInfo(modelId: string): Promise<ModelInfo | undefined> {
  const database = await initDB()
  return database.get(MODEL_INFO_STORE, modelId)
}

// Save custom classes mapping
export async function saveCustomClassesMapping(
  mapping: Omit<CustomClassesMapping, "createdAt" | "lastUsed">,
): Promise<CustomClassesMapping> {
  const database = await initDB()

  const completeMapping: CustomClassesMapping = {
    ...mapping,
    createdAt: Date.now(),
    lastUsed: Date.now(),
  }

  await database.put(CUSTOM_CLASSES_STORE, completeMapping)
  return completeMapping
}

// Get custom classes mapping by ID
export async function getCustomClassesMapping(mappingId: string): Promise<CustomClassesMapping | undefined> {
  const database = await initDB()
  return database.get(CUSTOM_CLASSES_STORE, mappingId)
}

// Get custom classes mappings by model ID
export async function getCustomClassesMappingsByModel(modelId: string): Promise<CustomClassesMapping[]> {
  const database = await initDB()
  const index = database.transaction(CUSTOM_CLASSES_STORE).store.index("modelId")
  return index.getAll(modelId)
}

// Delete custom classes mapping
export async function deleteCustomClassesMapping(mappingId: string): Promise<void> {
  const database = await initDB()
  await database.delete(CUSTOM_CLASSES_STORE, mappingId)
}

// Check if a model exists
export async function modelExists(modelId: string): Promise<boolean> {
  const database = await initDB()
  const modelInfo = await database.get(MODEL_INFO_STORE, modelId)
  return !!modelInfo
}

// Calculate model size in bytes
function calculateModelSize(artifacts: tf.io.ModelArtifacts): number {
  let size = 0

  // Add size of model topology
  if (artifacts.modelTopology) {
    size += new TextEncoder().encode(JSON.stringify(artifacts.modelTopology)).length
  }

  // Add size of weights
  if (artifacts.weightData) {
    size += artifacts.weightData.byteLength
  }

  return size
}

// Check if the browser supports IndexedDB
export function isIndexedDBSupported(): boolean {
  return typeof indexedDB !== "undefined"
}

// Check if the browser is online
export function isOnline(): boolean {
  return navigator.onLine
}

// Register event listeners for online/offline status
export function registerNetworkListeners(onOnline: () => void, onOffline: () => void): () => void {
  window.addEventListener("online", onOnline)
  window.addEventListener("offline", onOffline)

  return () => {
    window.removeEventListener("online", onOnline)
    window.removeEventListener("offline", onOffline)
  }
}

// Cache the default MobileNet model for offline use
export async function cacheDefaultMobileNetModel(): Promise<ModelInfo | null> {
  try {
    // Load the MobileNet model
    const mobilenet = await import("@tensorflow-models/mobilenet")
    const model = await mobilenet.load({
      version: 2,
      alpha: 0.5,
    })

    // Save the model to IndexedDB
    const modelInfo = await saveModel(model.model, {
      id: "default-mobilenet-v2",
      name: "MobileNet v2 (Default)",
      type: "mobilenet",
      description: "Default MobileNet v2 model for product detection",
      isDefault: true,
    })

    return modelInfo
  } catch (error) {
    console.error("Error caching default MobileNet model:", error)
    return null
  }
}

// Load the default ImageNet classes
export async function loadImageNetClasses(): Promise<string[]> {
  try {
    const response = await fetch("https://storage.googleapis.com/tfjs-models/assets/mobilenet/imagenet_classes.json")
    return await response.json()
  } catch (error) {
    console.error("Error loading ImageNet classes:", error)
    throw error
  }
}

// Cache ImageNet classes for offline use
export async function cacheImageNetClasses(): Promise<void> {
  try {
    const classes = await loadImageNetClasses()
    localStorage.setItem("imagenet_classes", JSON.stringify(classes))
  } catch (error) {
    console.error("Error caching ImageNet classes:", error)
  }
}

// Get cached ImageNet classes
export function getCachedImageNetClasses(): string[] | null {
  try {
    const cachedClasses = localStorage.getItem("imagenet_classes")
    return cachedClasses ? JSON.parse(cachedClasses) : null
  } catch (error) {
    console.error("Error getting cached ImageNet classes:", error)
    return null
  }
}

// Initialize service worker for offline support
export async function registerServiceWorker(): Promise<void> {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js")
      console.log("Service worker registered:", registration)
    } catch (error) {
      console.error("Service worker registration failed:", error)
    }
  }
}
