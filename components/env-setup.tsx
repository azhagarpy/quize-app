"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function EnvSetup() {
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSave = () => {
    if (!supabaseUrl || !supabaseKey) {
      setError("Both Supabase URL and Anon Key are required")
      return
    }

    // Validate URL format
    try {
      new URL(supabaseUrl)
    } catch (e) {
      setError("Please enter a valid Supabase URL")
      return
    }

    // Basic validation for the key
    if (supabaseKey.length < 20) {
      setError("The Supabase Anon Key appears to be invalid")
      return
    }

    try {
      // Save to localStorage
      localStorage.setItem("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl)
      localStorage.setItem("NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseKey)

      setSuccess(true)
      setError(null)

      // Reload the page to apply the new environment variables
      setTimeout(() => {
        window.location.href = "/"
      }, 1500)
    } catch (error) {
      setError("Failed to save environment variables")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Supabase Configuration</CardTitle>
          <CardDescription>Enter your Supabase project details to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <AlertDescription>Configuration saved successfully! Redirecting to home page...</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="supabaseUrl">Supabase URL</Label>
            <Input
              id="supabaseUrl"
              placeholder="https://your-project-url.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Find this in your Supabase project settings under API</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabaseKey">Supabase Anon Key</Label>
            <Input
              id="supabaseKey"
              placeholder="your-anon-key"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find this in your Supabase project settings under API → Project API keys
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} className="w-full">
            Save Configuration
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

