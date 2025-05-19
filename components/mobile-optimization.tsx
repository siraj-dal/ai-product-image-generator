"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Smartphone, Cpu, Zap, MemoryStick } from "lucide-react"
import { getPerformanceConfig, updatePerformanceConfig } from "@/lib/image-processing"
import type { PerformanceConfig } from "@/lib/image-processing"

interface MobileOptimizationProps {
  onSettingsChange: () => void
}

export function MobileOptimization({ onSettingsChange }: MobileOptimizationProps) {
  const [performanceConfig, setPerformanceConfig] = useState<PerformanceConfig>(getPerformanceConfig())
  const [deviceType, setDeviceType] = useState<"auto" | "mobile" | "tablet" | "desktop">("auto")
  const [isLowPowerMode, setIsLowPowerMode] = useState(false)
  const [maxImageSize, setMaxImageSize] = useState(1024)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isCharging, setIsCharging] = useState<boolean | null>(null)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      setIsMobileDevice(isMobile)

      // Auto-set device type based on screen size
      const width = window.innerWidth
      if (width < 768) {
        setDeviceType("mobile")
      } else if (width < 1024) {
        setDeviceType("tablet")
      } else {
        setDeviceType("desktop")
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Check battery status if available
  useEffect(() => {
    if ("getBattery" in navigator) {
      // @ts-ignore - getBattery is not in the TypeScript types
      navigator.getBattery().then((battery: any) => {
        setBatteryLevel(battery.level * 100)
        setIsCharging(battery.charging)

        battery.addEventListener("levelchange", () => {
          setBatteryLevel(battery.level * 100)
        })

        battery.addEventListener("chargingchange", () => {
          setIsCharging(battery.charging)
        })
      })
    }
  }, [])

  // Apply optimized settings based on device type
  const applyDeviceOptimization = (type: "auto" | "mobile" | "tablet" | "desktop") => {
    setDeviceType(type)

    let newConfig: Partial<PerformanceConfig> = {}

    switch (type) {
      case "mobile":
        newConfig = {
          precision: "low",
          memoryManagement: "aggressive",
          useWebGL: true,
          useWasm: false,
          useWebGPU: false,
        }
        setMaxImageSize(512)
        break
      case "tablet":
        newConfig = {
          precision: "medium",
          memoryManagement: "balanced",
          useWebGL: true,
          useWasm: false,
          useWebGPU: false,
        }
        setMaxImageSize(768)
        break
      case "desktop":
        newConfig = {
          precision: "high",
          memoryManagement: "performance",
          useWebGL: true,
          useWasm: false,
          useWebGPU: false,
        }
        setMaxImageSize(1024)
        break
      case "auto":
        // Auto-detect based on device capabilities
        if (isMobileDevice) {
          if (batteryLevel !== null && batteryLevel < 20 && !isCharging) {
            // Low battery mode for mobile
            newConfig = {
              precision: "low",
              memoryManagement: "aggressive",
              useWebGL: true,
              useWasm: false,
              useWebGPU: false,
            }
            setMaxImageSize(512)
          } else {
            // Normal mobile
            newConfig = {
              precision: "medium",
              memoryManagement: "balanced",
              useWebGL: true,
              useWasm: false,
              useWebGPU: false,
            }
            setMaxImageSize(768)
          }
        } else {
          // Desktop
          newConfig = {
            precision: "high",
            memoryManagement: "performance",
            useWebGL: true,
            useWasm: false,
            useWebGPU: false,
          }
          setMaxImageSize(1024)
        }
        break
    }

    // Apply low power mode if enabled
    if (isLowPowerMode) {
      newConfig.precision = "low"
      newConfig.memoryManagement = "aggressive"
      setMaxImageSize(Math.min(maxImageSize, 512))
    }

    // Update the config
    setPerformanceConfig((prev) => ({ ...prev, ...newConfig }))
    updatePerformanceConfig(newConfig)
  }

  // Toggle low power mode
  const toggleLowPowerMode = (enabled: boolean) => {
    setIsLowPowerMode(enabled)

    if (enabled) {
      const lowPowerConfig: Partial<PerformanceConfig> = {
        precision: "low",
        memoryManagement: "aggressive",
      }
      setPerformanceConfig((prev) => ({ ...prev, ...lowPowerConfig }))
      updatePerformanceConfig(lowPowerConfig)
      setMaxImageSize(Math.min(maxImageSize, 512))
    } else {
      // Reapply device optimization without low power mode
      applyDeviceOptimization(deviceType)
    }
  }

  // Apply all settings
  const applySettings = () => {
    // Update global performance config
    updatePerformanceConfig(performanceConfig)

    // Store max image size in localStorage
    localStorage.setItem("maxImageSize", maxImageSize.toString())

    // Notify parent component
    onSettingsChange()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mobile Optimization</CardTitle>
        <CardDescription>Optimize performance for different devices and battery conditions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Device Type</Label>
                <p className="text-sm text-muted-foreground">Select your device type for optimal settings</p>
              </div>
            </div>
            <Select value={deviceType} onValueChange={(value) => applyDeviceOptimization(value as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto Detect</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {batteryLevel !== null && (
            <div className="bg-muted p-3 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Battery Status</span>
                <span className="text-sm">{isCharging ? "Charging" : "Not Charging"}</span>
              </div>
              <div className="w-full bg-background rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    batteryLevel < 20 ? "bg-destructive" : batteryLevel < 50 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${batteryLevel}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">0%</span>
                <span className="text-xs text-muted-foreground">{Math.round(batteryLevel)}%</span>
                <span className="text-xs text-muted-foreground">100%</span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="low-power-mode">Low Power Mode</Label>
                <p className="text-sm text-muted-foreground">Reduce processing quality to save battery</p>
              </div>
            </div>
            <Switch id="low-power-mode" checked={isLowPowerMode} onCheckedChange={toggleLowPowerMode} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-5 w-5 text-muted-foreground" />
                <Label>Processing Quality</Label>
              </div>
              <span className="text-sm text-muted-foreground capitalize">{performanceConfig.precision}</span>
            </div>
            <Select
              value={performanceConfig.precision}
              onValueChange={(value) => {
                const newConfig = { ...performanceConfig, precision: value as "low" | "medium" | "high" }
                setPerformanceConfig(newConfig)
                updatePerformanceConfig({ precision: value as "low" | "medium" | "high" })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (Fastest)</SelectItem>
                <SelectItem value="medium">Medium (Balanced)</SelectItem>
                <SelectItem value="high">High (Best Quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MemoryStick className="h-5 w-5 text-muted-foreground" />
                <Label>Memory Usage</Label>
              </div>
              <span className="text-sm text-muted-foreground capitalize">{performanceConfig.memoryManagement}</span>
            </div>
            <Select
              value={performanceConfig.memoryManagement}
              onValueChange={(value) => {
                const newConfig = {
                  ...performanceConfig,
                  memoryManagement: value as "aggressive" | "balanced" | "performance",
                }
                setPerformanceConfig(newConfig)
                updatePerformanceConfig({
                  memoryManagement: value as "aggressive" | "balanced" | "performance",
                })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select memory usage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aggressive">Aggressive (Low Memory)</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="performance">Performance (High Memory)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Maximum Image Size</Label>
            <span className="text-sm text-muted-foreground">{maxImageSize}px</span>
          </div>
          <Slider
            value={[maxImageSize]}
            min={256}
            max={2048}
            step={128}
            onValueChange={(value) => setMaxImageSize(value[0])}
          />
          <p className="text-xs text-muted-foreground">
            Larger images provide better quality but require more processing power and memory
          </p>
        </div>

        <Button className="w-full" onClick={applySettings}>
          Apply Optimization Settings
        </Button>
      </CardContent>
    </Card>
  )
}
