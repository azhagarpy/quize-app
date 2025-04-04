"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginForm } from "@/components/auth/login-form"
import { SignUpForm } from "@/components/auth/signup-form"
import { Brain, Trophy, Users } from "lucide-react"

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<string>("overview")

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Quize</h1>
          <Tabs value={activeTab} onValueChange={handleTabChange} defaultValue="overview" className="w-[400px]">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-4">
        <Tabs value={activeTab} onValueChange={handleTabChange} defaultValue="overview">
          <TabsContent value="overview">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mt-8">
              <Card>
                <CardHeader>
                  <Brain className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Challenge Your Knowledge</CardTitle>
                  <CardDescription>Test your skills with our diverse range of quiz questions</CardDescription>
                </CardHeader>
                <CardContent>
                  Play solo or compete with friends in our interactive quiz environment. Each correct answer earns you
                  experience points to level up!
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Multiplayer Rooms</CardTitle>
                  <CardDescription>Create or join rooms to play with friends in real-time</CardDescription>
                </CardHeader>
                <CardContent>
                  Chat with other players, see live scores, and enjoy the competitive atmosphere of our multiplayer quiz
                  rooms.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Trophy className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Track Your Progress</CardTitle>
                  <CardDescription>Earn XP and climb the ranks</CardDescription>
                </CardHeader>
                <CardContent>
                  Every correct answer brings you closer to the next rank. Compare your progress with other players on
                  our global leaderboards.
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Play?</h2>
              <div className="flex justify-center gap-4">
                <Button onClick={() => handleTabChange("login")}>Login</Button>
                <Button onClick={() => handleTabChange("signup")} variant="outline">
                  Sign Up
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="login">
            <div className="max-w-md mx-auto mt-8">
              <LoginForm />
            </div>
          </TabsContent>

          <TabsContent value="signup">
            <div className="max-w-md mx-auto mt-8">
              <SignUpForm />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Quize. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

