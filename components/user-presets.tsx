"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Save, Trash2, Edit2, Star, StarOff } from "lucide-react"
import type { ModelSettings } from "@/lib/types"
import type { BackgroundOptions } from "@/lib/background-replacement"
import type { SegmentationModel } from "@/lib/image-processing"

// Define the preset type
export interface UserPreset {
  id: string
  name: string
  description: string
  createdAt: string
  isFavorite: boolean
  settings: {
    modelSettings: ModelSettings
    backgroundOptions: BackgroundOptions
    backgroundRemoved: boolean
    autoCrop: boolean
    modelType: SegmentationModel
    backgroundType: "studio" | "lifestyle"
    brightness: number
    contrast: number
    resolution: "512x512" | "1024x1024"
  }
}

interface UserPresetsProps {
  currentSettings: {
    modelSettings: ModelSettings
    backgroundOptions: BackgroundOptions
    backgroundRemoved: boolean
    autoCrop: boolean
    modelType: SegmentationModel
    backgroundType: "studio" | "lifestyle"
    brightness: number
    contrast: number
    resolution: "512x512" | "1024x1024"
  }
  onApplyPreset: (preset: UserPreset) => void
}

export function UserPresets({ currentSettings, onApplyPreset }: UserPresetsProps) {
  const [presets, setPresets] = useState<UserPreset[]>([])
  const [newPresetName, setNewPresetName] = useState("")
  const [newPresetDescription, setNewPresetDescription] = useState("")
  const [editingPreset, setEditingPreset] = useState<UserPreset | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [presetToDelete, setPresetToDelete] = useState<UserPreset | null>(null)

  // Load presets from localStorage on component mount
  useEffect(() => {
    const savedPresets = localStorage.getItem("userPresets")
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets))
      } catch (error) {
        console.error("Error loading presets:", error)
        // If there's an error, initialize with empty array
        setPresets([])
      }
    }
  }, [])

  // Save presets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("userPresets", JSON.stringify(presets))
  }, [presets])

  // Create a new preset
  const createPreset = () => {
    if (!newPresetName.trim()) return

    const newPreset: UserPreset = {
      id: Date.now().toString(),
      name: newPresetName,
      description: newPresetDescription,
      createdAt: new Date().toISOString(),
      isFavorite: false,
      settings: { ...currentSettings },
    }

    setPresets((prev) => [...prev, newPreset])
    setNewPresetName("")
    setNewPresetDescription("")
    setIsCreateDialogOpen(false)
  }

  // Update an existing preset
  const updatePreset = () => {
    if (!editingPreset || !editingPreset.name.trim()) return

    setPresets((prev) => prev.map((preset) => (preset.id === editingPreset.id ? { ...editingPreset } : preset)))
    setEditingPreset(null)
    setIsEditDialogOpen(false)
  }

  // Delete a preset
  const deletePreset = () => {
    if (!presetToDelete) return

    setPresets((prev) => prev.filter((preset) => preset.id !== presetToDelete.id))
    setPresetToDelete(null)
  }

  // Toggle favorite status
  const toggleFavorite = (preset: UserPreset) => {
    setPresets((prev) => prev.map((p) => (p.id === preset.id ? { ...p, isFavorite: !p.isFavorite } : p)))
  }

  // Sort presets: favorites first, then by creation date (newest first)
  const sortedPresets = [...presets].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1
    if (!a.isFavorite && b.isFavorite) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>User Presets</CardTitle>
        <CardDescription>Save and load your custom settings</CardDescription>
      </CardHeader>
      <CardContent>
        {presets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">You haven't created any presets yet</p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Preset
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Preset</DialogTitle>
                  <DialogDescription>Save your current settings as a preset for future use</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="preset-name">Preset Name</Label>
                    <Input
                      id="preset-name"
                      placeholder="e.g., My Perfect Settings"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preset-description">Description (Optional)</Label>
                    <Input
                      id="preset-description"
                      placeholder="e.g., Best settings for clothing products"
                      value={newPresetDescription}
                      onChange={(e) => setNewPresetDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createPreset}>Save Preset</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {sortedPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleFavorite(preset)}
                        className="mr-2 text-yellow-500 hover:text-yellow-600"
                        title={preset.isFavorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        {preset.isFavorite ? (
                          <Star className="h-4 w-4 fill-current" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </button>
                      <div>
                        <h4 className="font-medium truncate">{preset.name}</h4>
                        {preset.description && (
                          <p className="text-xs text-muted-foreground truncate">{preset.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => onApplyPreset(preset)} title="Apply this preset">
                      Apply
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingPreset(preset)
                        setIsEditDialogOpen(true)
                      }}
                      title="Edit preset"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPresetToDelete(preset)}
                          title="Delete preset"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Preset</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{preset.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={deletePreset}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="flex justify-between p-4">
        <Button variant="outline" onClick={() => onApplyPreset(sortedPresets[0])} disabled={presets.length === 0}>
          Load Last Preset
        </Button>
        {presets.length > 0 && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Current Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Current Settings</DialogTitle>
                <DialogDescription>Save your current settings as a preset for future use</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-preset-name">Preset Name</Label>
                  <Input
                    id="new-preset-name"
                    placeholder="e.g., My Perfect Settings"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-preset-description">Description (Optional)</Label>
                  <Input
                    id="new-preset-description"
                    placeholder="e.g., Best settings for clothing products"
                    value={newPresetDescription}
                    onChange={(e) => setNewPresetDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createPreset}>Save Preset</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardFooter>
    </Card>
  )
}
