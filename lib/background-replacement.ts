import { removeBackground } from "./image-processing"
import type { SegmentationModel } from "./image-processing"

// Background types
export type BackgroundType = "color" | "image" | "gradient" | "blur"

// Background options
export interface BackgroundOptions {
  type: BackgroundType
  color?: string
  gradient?: {
    colors: string[]
    direction: "to bottom" | "to right" | "to bottom right" | "to bottom left"
  }
  image?: string
  blurAmount?: number
  opacity?: number
  scale?: number
  position?: {
    x: number
    y: number
  }
}

// Default background options
const defaultBackgroundOptions: BackgroundOptions = {
  type: "color",
  color: "#FFFFFF",
  gradient: {
    colors: ["#4158D0", "#C850C0", "#FFCC70"],
    direction: "to bottom right",
  },
  blurAmount: 10,
  opacity: 1,
  scale: 1,
  position: {
    x: 0.5,
    y: 0.5,
  },
}

// Function to replace the background of an image
export async function replaceBackground(
  imageUrl: string,
  backgroundOptions: Partial<BackgroundOptions> = {},
  options: {
    modelType?: SegmentationModel
    threshold?: number
    edgeBlur?: number
    progressCallback?: (progress: number, message: string) => void
  } = {},
): Promise<string> {
  const { modelType = "bodypix", threshold = 0.7, edgeBlur = 3, progressCallback } = options

  // Merge with default options
  const bgOptions: BackgroundOptions = { ...defaultBackgroundOptions, ...backgroundOptions }

  try {
    // First, remove the background to get a transparent image
    progressCallback?.(0.1, "Removing original background...")
    const transparentImage = await removeBackground(imageUrl, {
      modelType,
      threshold,
      edgeBlur,
      foregroundColor: { r: 0, g: 0, b: 0, a: 0 }, // Transparent foreground for composition
      backgroundColor: { r: 0, g: 0, b: 0, a: 0 }, // Transparent background
      progressCallback: (progress, message) => {
        progressCallback?.(0.1 + progress * 0.6, message)
      },
    })

    // Create a new image from the transparent result
    progressCallback?.(0.7, "Creating new background...")
    const foregroundImg = new Image()
    foregroundImg.crossOrigin = "anonymous"

    await new Promise((resolve, reject) => {
      foregroundImg.onload = resolve
      foregroundImg.onerror = reject
      foregroundImg.src = transparentImage
    })

    // Create a canvas for the final composition
    const canvas = document.createElement("canvas")
    canvas.width = foregroundImg.width
    canvas.height = foregroundImg.height
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("Could not get canvas context")
    }

    // Draw the background based on the type
    switch (bgOptions.type) {
      case "color":
        // Fill with solid color
        ctx.fillStyle = bgOptions.color || "#FFFFFF"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        break

      case "gradient":
        // Create gradient
        const gradient = ctx.createLinearGradient(
          0,
          0,
          bgOptions.gradient?.direction === "to right" ? canvas.width : 0,
          bgOptions.gradient?.direction === "to bottom" ? canvas.height : 0,
        )

        // Add color stops
        const colors = bgOptions.gradient?.colors || ["#FFFFFF", "#EEEEEE"]
        colors.forEach((color, index) => {
          gradient.addColorStop(index / (colors.length - 1), color)
        })

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        break

      case "image":
        if (bgOptions.image) {
          // Load background image
          const bgImage = new Image()
          bgImage.crossOrigin = "anonymous"

          await new Promise((resolve, reject) => {
            bgImage.onload = resolve
            bgImage.onerror = reject
            bgImage.src = bgOptions.image || ""
          })

          // Calculate dimensions to cover the canvas while maintaining aspect ratio
          const scale = bgOptions.scale || 1
          const position = bgOptions.position || { x: 0.5, y: 0.5 }

          let sw = bgImage.width * scale
          let sh = bgImage.height * scale
          let sx = 0
          let sy = 0

          // Ensure the scaled image covers the entire canvas
          if (sw / sh > canvas.width / canvas.height) {
            // Background image is wider than canvas
            sw = sh * (canvas.width / canvas.height)
            sx = (bgImage.width - sw) * position.x
          } else {
            // Background image is taller than canvas
            sh = sw * (canvas.height / canvas.width)
            sy = (bgImage.height - sh) * position.y
          }

          // Draw the background image
          ctx.globalAlpha = bgOptions.opacity || 1
          ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
          ctx.globalAlpha = 1
        }
        break

      case "blur":
        // Create a blurred version of the original image
        const blurCanvas = document.createElement("canvas")
        blurCanvas.width = canvas.width
        blurCanvas.height = canvas.height
        const blurCtx = blurCanvas.getContext("2d")

        if (!blurCtx) {
          throw new Error("Could not get blur canvas context")
        }

        // Load the original image
        const originalImg = new Image()
        originalImg.crossOrigin = "anonymous"

        await new Promise((resolve, reject) => {
          originalImg.onload = resolve
          originalImg.onerror = reject
          originalImg.src = imageUrl
        })

        // Draw the original image
        blurCtx.drawImage(originalImg, 0, 0, canvas.width, canvas.height)

        // Apply blur filter
        const blurAmount = bgOptions.blurAmount || 10
        blurCtx.filter = `blur(${blurAmount}px)`
        blurCtx.globalAlpha = 0.8
        blurCtx.drawImage(blurCanvas, 0, 0)
        blurCtx.globalAlpha = 1
        blurCtx.filter = "none"

        // Draw the blurred background to the main canvas
        ctx.drawImage(blurCanvas, 0, 0)
        break
    }

    // Draw the foreground image with transparency
    progressCallback?.(0.9, "Compositing final image...")
    ctx.drawImage(foregroundImg, 0, 0)

    progressCallback?.(1.0, "Background replacement complete")

    // Return the data URL of the canvas
    return canvas.toDataURL("image/png")
  } catch (error) {
    console.error("Error replacing background:", error)
    throw new Error("Failed to replace background")
  }
}

// Function to get a list of preset backgrounds
export function getBackgroundPresets(): { id: string; name: string; options: BackgroundOptions; thumbnail: string }[] {
  return [
    {
      id: "white",
      name: "Studio White",
      options: {
        type: "color",
        color: "#FFFFFF",
      },
      thumbnail: "/white-background.png",
    },
    {
      id: "gradient-blue",
      name: "Blue Gradient",
      options: {
        type: "gradient",
        gradient: {
          colors: ["#4158D0", "#C850C0"],
          direction: "to bottom right",
        },
      },
      thumbnail: "/placeholder.svg?key=8vdq5",
    },
    {
      id: "outdoor",
      name: "Outdoor Scene",
      options: {
        type: "image",
        image: "/placeholder.svg?key=47m99",
        scale: 1.2,
        position: { x: 0.5, y: 0.5 },
      },
      thumbnail: "/placeholder.svg?key=4gv3j",
    },
    {
      id: "blur",
      name: "Blurred Original",
      options: {
        type: "blur",
        blurAmount: 15,
      },
      thumbnail: "/placeholder.svg?key=15y0c",
    },
  ]
}
