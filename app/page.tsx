import type { Metadata } from "next"
import ImageGenerator from "@/components/image-generator"

export const metadata: Metadata = {
  title: "AI Product Image Generator",
  description: "Generate professional product images with AI",
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <ImageGenerator />
    </div>
  )
}
