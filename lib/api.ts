import type { GenerateImageParams, GenerateImageResult } from "./types"
import { formatHeight } from "./utils"
import { processImage } from "./image-processing"

// Constants for model selection
export const IMAGE_GENERATION_MODELS = {
  STABLE_DIFFUSION: "stable-diffusion",
  STABLE_DIFFUSION_XL: "stable-diffusion-xl",
  PIXART_ALPHA: "pixart-alpha",
  KANDINSKY: "kandinsky",
  MOCK: "mock", // For testing without API calls
}

// Model endpoints mapping
const MODEL_ENDPOINTS = {
  [IMAGE_GENERATION_MODELS.STABLE_DIFFUSION]: "runwayml/stable-diffusion-v1-5",
  [IMAGE_GENERATION_MODELS.STABLE_DIFFUSION_XL]: "Stable Diffusion XL",
  [IMAGE_GENERATION_MODELS.PIXART_ALPHA]: "PixArt-alpha/PixArt-XL-2-1024-MS",
  [IMAGE_GENERATION_MODELS.KANDINSKY]: "kandinsky-community/kandinsky-2-2-decoder",
}

// Real API function for image generation using open-source models
export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  try {
    // Process the product image if needed (background removal, auto-crop)
    let processedImageUrl = params.productImage

    if (params.backgroundRemoved || params.autoCrop) {
      processedImageUrl = await processImage(params.productImage, {
        removeBackground: params.backgroundRemoved,
        autoCrop: params.autoCrop,
        backgroundColor: { r: 255, g: 255, b: 255, a: 1 }, // White background
      })
    }

    // Use the custom prompt if provided, otherwise create one from params
    const prompt = params.customPrompt || createPromptFromParams(params, processedImageUrl)
    const negativePrompt =
      params.negativePrompt ||
      "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text"

    console.log("api_file, generationModel",params.modelType)
    // Select which model to use (defaulting to Stable Diffusion)
    const modelType = params.modelType || IMAGE_GENERATION_MODELS.STABLE_DIFFUSION_XL

    // For testing without API calls
    if (modelType === IMAGE_GENERATION_MODELS.MOCK) {
      return getMockGeneratedImage(params)
    }

    // Check if we have an API key
    const apiKey = process.env.HUGGINGFACE_API_KEY || localStorage.getItem("huggingface_api_key")
    if (!apiKey || apiKey === "hf_dummy_key_for_demo") {
      console.warn("Using mock generator because no valid Hugging Face API key was found")
      return getMockGeneratedImage(params, "No valid Hugging Face API key")
    }

    // Start timing for performance measurement
    const startTime = Date.now()

    // Generate image using the selected model
    const imageUrl = await generateWithOpenSourceModel(modelType, prompt, negativePrompt, params.resolution)

    // Calculate processing time
    const processingTime = Date.now() - startTime

    // Return the generated image URL and metadata
    return {
      imageUrl,
      metadata: {
        processingTime,
        aiModel: modelType,
        prompt,
        negativePrompt,
      },
    }
  } catch (error) {
    console.error("Error generating image:", error)

    // If there's an API error, return a mock image with the error message
    if (error instanceof Error && error.message.includes("Hugging Face API error")) {
      return getMockGeneratedImage(params, error.message)
    }

    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function generateImageFromPrompt(
  prompt: string,
  negativePrompt: string = "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
  modelType: string = IMAGE_GENERATION_MODELS.STABLE_DIFFUSION_XL,
  resolution: "512x512" | "1024x1024" = "512x512"
): Promise<string> {
  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY || localStorage.getItem("huggingface_api_key")
    if (!apiKey || apiKey === "hf_dummy_key_for_demo") {
      console.warn("Using mock generator - no valid Hugging Face API key")

      const mockParams: GenerateImageParams = {
        productImage: "",
        backgroundRemoved: false,
        autoCrop: false,
        modelSettings: {
          gender: "female",
          bodyType: 50,
          hairstyle: "long-straight",
          height: 165,
          skinTone: "#D2B48C",
        },
        resolution,
        backgroundType: "studio",
        brightness: 50,
        contrast: 50,
        modelType,
        customPrompt: prompt,
        negativePrompt,
      }

      const result = getMockGeneratedImage(mockParams, "No valid Hugging Face API key")
      return result.imageUrl
    }

    const imageUrl = await generateWithOpenSourceModel(modelType, prompt, negativePrompt, resolution)
    return imageUrl
  } catch (error) {
    console.error("Error in prompt-only image generation:", error)

    const fallbackParams: GenerateImageParams = {
      productImage: "",
      backgroundRemoved: false,
      autoCrop: false,
      modelSettings: {
        gender: "female",
        bodyType: 50,
        hairstyle: "long-straight",
        height: 165,
        skinTone: "#D2B48C",
      },
      resolution,
      backgroundType: "studio",
      brightness: 50,
      contrast: 50,
      modelType,
      customPrompt: prompt,
      negativePrompt,
    }

    const result = getMockGeneratedImage(fallbackParams, "Error fallback")
    return result.imageUrl
  }
}


// Function to generate images with different open-source models
async function generateWithOpenSourceModel(
  modelType: string,
  prompt: string,
  negativePrompt: string,
  resolution: "512x512" | "1024x1024",
): Promise<string> {
  // Parse resolution into width and height
  const [width, height] = resolution.split("x").map(Number)

  // Get the model endpoint
  const modelEndpoint = MODEL_ENDPOINTS[modelType]
  if (!modelEndpoint) {
    throw new Error(`Unknown model type: ${modelType}`)
  }

  // Get API key from environment or localStorage
  const apiKey = process.env.HUGGINGFACE_API_KEY || localStorage.getItem("huggingface_api_key")
  console.log("Model Endpoint is *****",modelEndpoint)
  // Make the API request to Hugging Face
  // const response = await fetch(`https://api-inference.huggingface.co/models/${modelEndpoint}`, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${apiKey}`,
  //   },
  //   body: JSON.stringify({
  //     inputs: prompt,
  //     parameters: {
  //       width: width,
  //       height: height,
  //       num_inference_steps: 50,
  //       guidance_scale: 7.5,
  //       negative_prompt: negativePrompt,
  //     },
  //   }),
  // })
  // if (!response.ok) {
  //   let errorMessage = "Hugging Face API error"
  //   try {
  //     const errorData = await response.json()
  //     errorMessage = `Hugging Face API error: ${errorData.error || JSON.stringify(errorData)}`
  //   } catch {
  //     errorMessage = `Hugging Face API error: ${response.status} ${response.statusText}`
  //   }
  //   throw new Error(errorMessage)
  // }

  // // The response is the image blob
  // const blob = await response.blob()
  // return URL.createObjectURL(blob)
  const formData = new FormData();
  formData.append("prompt",prompt);
  formData.append("model_choice",modelEndpoint)
  const response = await fetch("http://localhost:8000/fashion/generate_new", {
    method: "POST",
    body: formData, // ✅ no need to set headers manually
  });
  if (!response.ok) {
    let errorMessage = "Image generation API error";
    try {
      const errorData = await response.json();
      errorMessage = `API error: ${errorData.error || JSON.stringify(errorData)}`;
    } catch {
      errorMessage = `API error: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  if (!data.result) {
    throw new Error("Image URL not found in response");
  }
  
  return data.result; // ✅ This is your hosted image URL

  

  
}

// Mock function for testing without API calls
function getMockGeneratedImage(params: GenerateImageParams, errorMessage?: string): GenerateImageResult {
  const { modelSettings, backgroundType, customPrompt } = params
  const gender = modelSettings.gender
  const bodyType = modelSettings.bodyType < 33 ? "petite" : modelSettings.bodyType < 66 ? "average" : "plus-size"

  let placeholderQuery = customPrompt || `${gender} ${bodyType} model wearing clothes on ${backgroundType} background`

  if (errorMessage) {
    placeholderQuery = `Error: ${errorMessage} - ${placeholderQuery}`
  }

  // ✅ Dynamic resolution support
  const resolution = params.resolution || "1024x1024"
  const [width, height] = resolution.split("x").map(Number)
  const imageUrl = `/placeholder.svg?height=${height}&width=${width}&query=${encodeURIComponent(placeholderQuery)}`

  return {
    imageUrl,
    metadata: {
      processingTime: 500,
      aiModel: errorMessage ? "Error" : "Mock Generator",
      prompt: customPrompt || createPromptFromParams(params),
      negativePrompt:
        params.negativePrompt ||
        "low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, logo, text",
    },
  }
}


// Helper function to create a detailed prompt based on the parameters
function createPromptFromParams(params: GenerateImageParams, processedImageUrl?: string): string {
  const { modelSettings, backgroundType, brightness, contrast } = params

  // Describe the model
  const gender = modelSettings.gender
  const bodyType = modelSettings.bodyType < 33 ? "petite" : modelSettings.bodyType < 66 ? "average build" : "plus size"
  const height = formatHeight(modelSettings.height)
  const hairstyle = modelSettings.hairstyle.replace("-", " ")

  // Describe the background
  const background =
    backgroundType === "studio" ? "clean white studio background for e-commerce" : "natural lifestyle environment"

  // Describe lighting
  const lighting =
    `with ${brightness > 60 ? "bright" : brightness < 40 ? "soft" : "balanced"} lighting` +
    `${contrast > 60 ? " and high contrast" : contrast < 40 ? " and low contrast" : ""}`

  // Create the full prompt
  return `Create a professional product image of a ${gender} model wearing the uploaded product. 
The model should have a ${bodyType} body type, ${hairstyle} hair, ${height} tall, 
with skin tone similar to ${modelSettings.skinTone} hex color.
The image should have a ${background} ${lighting}.
Make the product the focal point of the image. Photorealistic style, high quality, detailed texture, professional photography.`
}

// Function to validate the Hugging Face API key
export async function validateHuggingFaceApiKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  try {
    // First, verify the API key format
    if (!apiKey || apiKey.trim() === '') {
      return { valid: false, message: "API key cannot be empty. Please enter a valid Hugging Face API key." }
    }

    // Check if the API key follows the expected format (typically starts with 'hf_')
    if (!apiKey.startsWith('hf_')) {
      return { 
        valid: false, 
        message: "Invalid API key format. Hugging Face API keys typically start with 'hf_'. Please check your key." 
      }
    }

    // Make a request to the Hugging Face user info endpoint to verify the key
    const userInfoResponse = await fetch("https://huggingface.co/api/whoami-v2", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    // If we can get user info, the key is definitely valid
    if (userInfoResponse.ok) {
      const userData = await userInfoResponse.json()
      return { 
        valid: true, 
        message: `API key is valid. Connected to Hugging Face account: ${userData.name || userData.username || 'User'}` 
      }
    }

    // If user info fails, try the model API as fallback
    const modelResponse = await fetch("https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: "Test prompt for API key validation",
        parameters: {
          width: 256,
          height: 256,
          num_inference_steps: 1, // Minimal steps for quick validation
        },
      }),
    })

    // Check for specific error codes
    if (modelResponse.status === 401 || modelResponse.status === 403) {
      return { valid: false, message: "Invalid API key. Please check your Hugging Face API key or generate a new one." }
    }

    if (modelResponse.status === 429) {
      return { valid: true, message: "API key is valid, but you've reached the rate limit. Try again later." }
    }

    if (!modelResponse.ok) {
      const errorData = await modelResponse.json().catch(() => ({}))
      return {
        valid: false,
        message: `API error: ${errorData.error || modelResponse.statusText}. Please try again or generate a new key.`,
      }
    }

    // If we get here, the key is valid
    return { valid: true, message: "API key is valid and ready to use with image generation models." }
  } catch (error) {
    console.error("Error validating Hugging Face API key:", error)
    return {
      valid: false,
      message: `Error validating API key: ${error instanceof Error ? error.message : String(error)}. Please check your internet connection and try again.`,
    }
  }
}
