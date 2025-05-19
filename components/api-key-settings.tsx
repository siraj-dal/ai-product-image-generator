"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { validateHuggingFaceApiKey } from "@/lib/api"

interface ApiKeySettingsProps {
  onApiKeyValidated?: (isValid: boolean) => void
}

export function ApiKeySettings({ onApiKeyValidated }: ApiKeySettingsProps) {
  const [apiKey, setApiKey] = useState("")
  const [savedApiKey, setSavedApiKey] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)

  // Check if we have a saved API key on component mount
  useEffect(() => {
    const savedKey = localStorage.getItem("huggingface_api_key")
    if (savedKey) {
      setSavedApiKey(savedKey)
      setApiKey(savedKey)
      validateApiKey(savedKey)
    }
  }, [])

  // Function to validate the API key
  const validateApiKey = async (key: string) => {
    setIsValidating(true)
    setValidationResult(null)

    try {
      const result = await validateHuggingFaceApiKey(key)
      setValidationResult(result)

      if (result.valid) {
        // Save the valid key to localStorage
        localStorage.setItem("huggingface_api_key", key)
        setSavedApiKey(key)
      }

      // Notify parent component
      onApiKeyValidated?.(result.valid)
    } catch (error) {
      setValidationResult({
        valid: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
      onApiKeyValidated?.(false)
    } finally {
      setIsValidating(false)
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    validateApiKey(apiKey)
  }

  // Clear the API key
  const handleClear = () => {
    setApiKey("")
    setSavedApiKey("")
    setValidationResult(null)
    localStorage.removeItem("huggingface_api_key")
    onApiKeyValidated?.(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hugging Face API Key</CardTitle>
        <CardDescription>
          Configure your Hugging Face API key to use open-source image generation models
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="flex space-x-2">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                placeholder="Enter your Hugging Face API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={() => setShowApiKey(!showApiKey)}>
                {showApiKey ? "Hide" : "Show"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                huggingface.co/settings/tokens
              </a>
            </p>
          </div>

          {validationResult && (
            <Alert variant={validationResult.valid ? "default" : "destructive"}>
              {validationResult.valid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{validationResult.valid ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{validationResult.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-2">
            <Button type="submit" disabled={isValidating || !apiKey}>
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Validate & Save"
              )}
            </Button>
            {savedApiKey && (
              <Button type="button" variant="outline" onClick={handleClear}>
                Clear API Key
              </Button>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4 text-xs text-muted-foreground">
        <p>API keys are stored locally in your browser and never sent to our servers.</p>
        {savedApiKey && <p>Using saved API key</p>}
      </CardFooter>
    </Card>
  )
}
