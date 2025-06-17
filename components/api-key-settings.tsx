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
  const [lastValidatedKey, setLastValidatedKey] = useState("")

  // Check if we have a saved API key on component mount
  useEffect(() => {
    const savedKey = localStorage.getItem("huggingface_api_key")
    if (savedKey) {
      setSavedApiKey(savedKey)
      setApiKey(savedKey)
      setLastValidatedKey(savedKey)
      validateApiKey(savedKey)
    }
  }, [])

  // Function to validate the API key
  const validateApiKey = async (key: string) => {
    // Don't revalidate if the key hasn't changed since last validation
    if (key === lastValidatedKey && validationResult) {
      return
    }
    
    setIsValidating(true)
    setValidationResult(null)

    try {
      const result = await validateHuggingFaceApiKey(key)
      setValidationResult(result)
      setLastValidatedKey(key)

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
            <div className="flex justify-between items-center">
              <Label htmlFor="api-key">API Key</Label>
              {savedApiKey && (
                <span className="text-xs text-green-600 font-medium flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Key Saved
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                placeholder="Enter your Hugging Face API key (starts with hf_)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={validationResult?.valid ? "border-green-500" : ""}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowApiKey(!showApiKey)}
                size="icon"
                title={showApiKey ? "Hide API Key" : "Show API Key"}
              >
                {showApiKey ? "Hide" : "Show"}
              </Button>
            </div>
            <div className="flex justify-between items-center">
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
              {apiKey && apiKey !== savedApiKey && (
                <p className="text-xs text-amber-600">Unsaved changes</p>
              )}
            </div>
          </div>

          {validationResult && (
            <Alert variant={validationResult.valid ? "default" : "destructive"}>
              {validationResult.valid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{validationResult.valid ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{validationResult.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-2">
            <Button 
              type="submit" 
              disabled={isValidating || !apiKey}
              className="flex-1"
            >
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
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClear}
                className="flex-1"
              >
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
