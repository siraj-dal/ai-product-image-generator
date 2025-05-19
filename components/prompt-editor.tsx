"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Shirt,
  HardDriveIcon as Boot,
  Watch,
  Smartphone,
  Sofa,
  Sparkles,
  Dumbbell,
  Gamepad2,
  Plus,
  Copy,
  RefreshCw,
  Wand2,
} from "lucide-react"
import {
  productTypes,
  promptTemplates,
  getTemplatesForProductType,
  getDefaultTemplateForProductType,
  fillPromptTemplate,
  type ProductType,
} from "@/lib/prompt-templates"
import { formatHeight } from "@/lib/utils"
import type { ModelSettings } from "@/lib/types"

interface PromptEditorProps {
  modelSettings: ModelSettings
  backgroundType: "studio" | "lifestyle"
  brightness: number
  contrast: number
  productName?: string
  onPromptChange: (prompt: string, negativePrompt?: string) => void
  onProductTypeChange?: (productType: ProductType) => void
}

export function PromptEditor({
  modelSettings,
  backgroundType,
  brightness,
  contrast,
  productName = "product",
  onPromptChange,
  onProductTypeChange,
}: PromptEditorProps) {
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<string>("clothing")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [customPrompt, setCustomPrompt] = useState<string>("")
  const [customNegativePrompt, setCustomNegativePrompt] = useState<string>("")
  const [productSpecificName, setProductSpecificName] = useState<string>("")
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [previewPrompt, setPreviewPrompt] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"templates" | "custom">("templates")

  // Get the icon component for a product type
  const getIconForProductType = (iconName: string) => {
    switch (iconName) {
      case "shirt":
        return <Shirt className="h-4 w-4" />
      case "boot":
        return <Boot className="h-4 w-4" />
      case "watch":
        return <Watch className="h-4 w-4" />
      case "smartphone":
        return <Smartphone className="h-4 w-4" />
      case "sofa":
        return <Sofa className="h-4 w-4" />
      case "sparkles":
        return <Sparkles className="h-4 w-4" />
      case "dumbbell":
        return <Dumbbell className="h-4 w-4" />
      case "gamepad-2":
        return <Gamepad2 className="h-4 w-4" />
      case "plus":
        return <Plus className="h-4 w-4" />
      default:
        return <Shirt className="h-4 w-4" />
    }
  }

  // Initialize with the default template for the selected product type
  useEffect(() => {
    const defaultTemplate = getDefaultTemplateForProductType(selectedProductTypeId)
    if (defaultTemplate) {
      setSelectedTemplateId(defaultTemplate.id)
      setCustomPrompt(defaultTemplate.template)
      setCustomNegativePrompt(defaultTemplate.negativePrompt || "")
    }
  }, [selectedProductTypeId])

  // Update the preview prompt when template or settings change
  useEffect(() => {
    updatePreviewPrompt()
  }, [
    selectedTemplateId,
    customPrompt,
    modelSettings,
    backgroundType,
    brightness,
    contrast,
    productSpecificName,
    isCustomizing,
  ])

  // Update the product type when the selected product type changes
  useEffect(() => {
    const productType = productTypes.find((type) => type.id === selectedProductTypeId)
    if (productType && onProductTypeChange) {
      onProductTypeChange(productType)
    }
  }, [selectedProductTypeId, onProductTypeChange])

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    const template = promptTemplates.find((t) => t.id === templateId)
    if (template) {
      setSelectedTemplateId(templateId)
      setCustomPrompt(template.template)
      setCustomNegativePrompt(template.negativePrompt || "")
      setIsCustomizing(false)
    }
  }

  // Handle product type selection
  const handleProductTypeChange = (productTypeId: string) => {
    setSelectedProductTypeId(productTypeId)
    const defaultTemplate = getDefaultTemplateForProductType(productTypeId)
    if (defaultTemplate) {
      setSelectedTemplateId(defaultTemplate.id)
      setCustomPrompt(defaultTemplate.template)
      setCustomNegativePrompt(defaultTemplate.negativePrompt || "")
      setIsCustomizing(false)
    }
  }

  // Update the preview prompt
  const updatePreviewPrompt = () => {
    // Get the current template
    const currentTemplate = isCustomizing
      ? customPrompt
      : promptTemplates.find((t) => t.id === selectedTemplateId)?.template || ""

    // Get the product-specific field name based on the product type
    const productFieldName = getProductFieldName(selectedProductTypeId)

    // Create values object for template filling
    const values: { [key: string]: string } = {
      gender: modelSettings.gender,
      body_type: modelSettings.bodyType < 33 ? "petite" : modelSettings.bodyType < 66 ? "average build" : "plus size",
      hairstyle: modelSettings.hairstyle.replace("-", " "),
      height: formatHeight(modelSettings.height),
      skin_tone: modelSettings.skinTone,
      background:
        backgroundType === "studio" ? "clean white studio background for e-commerce" : "natural lifestyle environment",
      lighting:
        `with ${brightness > 60 ? "bright" : brightness < 40 ? "soft" : "balanced"} lighting` +
        `${contrast > 60 ? " and high contrast" : contrast < 40 ? " and low contrast" : ""}`,
    }

    // Add product-specific name if available
    if (productFieldName && productSpecificName) {
      values[productFieldName] = productSpecificName || productName
    }

    // Fill the template with values
    const filled = fillPromptTemplate(currentTemplate, values)
    setPreviewPrompt(filled)

    // Notify parent component
    onPromptChange(
      filled,
      isCustomizing ? customNegativePrompt : promptTemplates.find((t) => t.id === selectedTemplateId)?.negativePrompt,
    )
  }

  // Get the product-specific field name based on the product type
  const getProductFieldName = (productTypeId: string): string => {
    switch (productTypeId) {
      case "clothing":
        return "clothing_type"
      case "footwear":
        return "footwear_type"
      case "accessories":
        return "accessory_type"
      case "electronics":
        return "electronics_type"
      case "home":
        return "home_item_type"
      case "beauty":
        return "beauty_product_type"
      case "sports":
        return "sports_item_type"
      case "toys":
        return "toy_type"
      default:
        return ""
    }
  }

  // Handle customizing the template
  const handleCustomizeTemplate = () => {
    setIsCustomizing(true)
    setActiveTab("custom")
  }

  // Handle resetting to the selected template
  const handleResetToTemplate = () => {
    const template = promptTemplates.find((t) => t.id === selectedTemplateId)
    if (template) {
      setCustomPrompt(template.template)
      setCustomNegativePrompt(template.negativePrompt || "")
      setIsCustomizing(false)
      setActiveTab("templates")
    }
  }

  // Copy prompt to clipboard
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(previewPrompt)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Prompt Templates</CardTitle>
        <CardDescription>Select or customize prompts for different product types</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Product Type</Label>
          <div className="grid grid-cols-4 gap-2">
            {productTypes.map((type) => (
              <Button
                key={type.id}
                variant={selectedProductTypeId === type.id ? "default" : "outline"}
                className="flex flex-col items-center justify-center h-20 p-2"
                onClick={() => handleProductTypeChange(type.id)}
              >
                <div className="mb-1">{getIconForProductType(type.icon)}</div>
                <span className="text-xs text-center">{type.name}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-name">Product Name</Label>
          <Input
            id="product-name"
            placeholder={`Enter ${selectedProductTypeId} name (e.g., "cotton t-shirt")`}
            value={productSpecificName}
            onChange={(e) => setProductSpecificName(e.target.value)}
          />
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "templates" | "custom")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="custom">Custom Prompt</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <ScrollArea className="h-[200px] rounded-md border p-2">
              <div className="space-y-2">
                {getTemplatesForProductType(selectedProductTypeId).map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedTemplateId === template.id
                        ? "bg-primary/10 border-primary border"
                        : "border hover:bg-accent"
                    }`}
                    onClick={() => handleTemplateChange(template.id)}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{template.name}</h4>
                      {template.isDefault && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Default</span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button onClick={handleCustomizeTemplate} variant="outline" className="w-full">
              <Wand2 className="h-4 w-4 mr-2" />
              Customize This Template
            </Button>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-prompt">Custom Prompt</Label>
              <Textarea
                id="custom-prompt"
                placeholder="Enter your custom prompt template..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Use placeholders like {"{gender}"}, {"{body_type}"}, {"{background}"}, etc. for dynamic values.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="negative-prompt">Negative Prompt</Label>
              <Textarea
                id="negative-prompt"
                placeholder="Enter negative prompt to avoid unwanted elements..."
                value={customNegativePrompt}
                onChange={(e) => setCustomNegativePrompt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Negative prompts help avoid unwanted elements in the generated image.
              </p>
            </div>

            {isCustomizing && (
              <Button onClick={handleResetToTemplate} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset to Selected Template
              </Button>
            )}
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Preview Prompt</Label>
            <Button variant="ghost" size="sm" onClick={handleCopyPrompt}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
          <div className="p-3 bg-muted rounded-md text-sm">
            <p className="whitespace-pre-wrap">{previewPrompt}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          <p>Specialized prompts help generate better images for specific product types.</p>
        </div>
      </CardFooter>
    </Card>
  )
}
