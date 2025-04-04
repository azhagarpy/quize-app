"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Mail } from "lucide-react"

export function SignUpForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { supabase, ensureProfile } = useSupabase()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // First, check if username is already taken
      const { data: existingUser, error: usernameError } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .single()

      if (existingUser) {
        throw new Error("Username is already taken. Please choose another one.")
      }

      // Sign up the user
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // Sign in the user immediately after signup
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        // Ensure profile exists
        await ensureProfile(data.user)

        // Show success message
        setSuccess(true)

        // Redirect to dashboard after a delay
        setTimeout(() => {
          router.push("/dashboard")
        }, 3000)
      } else {
        // If email confirmation is required
        setSuccess(true)
      }
    } catch (error: any) {
      setError(error.message || "An error occurred during sign up")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="border-2 border-green-200 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-700">Registration Successful!</CardTitle>
          <CardDescription className="text-green-600">Please check your email to confirm your account</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 text-muted-foreground">
            We've sent a confirmation email to <strong>{email}</strong>. Please click the link in the email to activate
            your account.
          </p>
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="game-card">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Enter your details to create a new account</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4 animate-shake">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="cooluser123"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="border-2 focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-2 focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-2 focus:border-primary/50"
            />
          </div>
          <Button
            type="submit"
            className="w-full game-shadow bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

