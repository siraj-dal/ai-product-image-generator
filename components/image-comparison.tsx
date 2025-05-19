"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, Maximize2, Minimize2 } from "lucide-react"

interface ImageComparisonProps {
  beforeImage: string
  afterImage: string
  title?: string
  fullWidth?: boolean
  onToggleFullWidth?: () => void
}

export function ImageComparison({
  beforeImage,
  afterImage,
  title = "Before / After Comparison",
  fullWidth = false,
  onToggleFullWidth,
}: ImageComparisonProps) {
  const [position, setPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isSwapped, setIsSwapped] = useState(false)

  // Handle mouse/touch events for dragging
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMove = (clientX: number) => {
      if (!isDragging || !container) return

      const rect = container.getBoundingClientRect()
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
      const newPosition = Math.max(0, Math.min(100, (x / rect.width) * 100))
      setPosition(newPosition)
    }

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX)

    const handleMouseUp = () => setIsDragging(false)
    const handleTouchEnd = () => setIsDragging(false)

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("touchmove", handleTouchMove, { passive: true })
      document.addEventListener("mouseup", handleMouseUp)
      document.addEventListener("touchend", handleTouchEnd)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [isDragging])

  const handleSwapImages = () => {
    setIsSwapped(!isSwapped)
  }

  // Get the actual images to display based on swap state
  const displayBeforeImage = isSwapped ? afterImage : beforeImage
  const displayAfterImage = isSwapped ? beforeImage : afterImage

  return (
    <Card className={fullWidth ? "w-full" : "w-full max-w-3xl mx-auto"}>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">{title}</h3>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleSwapImages}>
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Swap
            </Button>
            {onToggleFullWidth && (
              <Button variant="outline" size="sm" onClick={onToggleFullWidth}>
                {fullWidth ? (
                  <>
                    <Minimize2 className="h-4 w-4 mr-2" />
                    Compact
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Expand
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative w-full aspect-square overflow-hidden rounded-md border cursor-col-resize"
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
        >
          {/* Before image (full width) */}
          <div className="absolute inset-0">
            <img
              src={displayBeforeImage || "/placeholder.svg"}
              alt="Before"
              className="w-full h-full object-contain bg-muted"
              draggable="false"
            />
          </div>

          {/* After image (clipped) */}
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
            <img
              src={displayAfterImage || "/placeholder.svg"}
              alt="After"
              className="w-full h-full object-contain bg-muted"
              style={{ width: `${100 / (position / 100)}%` }}
              draggable="false"
            />
          </div>

          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-primary cursor-col-resize"
            style={{ left: `${position}%`, transform: "translateX(-50%)" }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
              <ArrowLeftRight className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {isSwapped ? "After" : "Before"}
          </div>
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {isSwapped ? "Before" : "After"}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Comparison Position</Label>
            <span className="text-sm text-muted-foreground">{Math.round(position)}%</span>
          </div>
          <Slider value={[position]} min={0} max={100} step={1} onValueChange={(value) => setPosition(value[0])} />
        </div>
      </CardContent>
    </Card>
  )
}
