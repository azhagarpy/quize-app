"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, Clock, HelpCircle } from "lucide-react"

interface SinglePlayerSetupProps {
  userId: string
}

export function SinglePlayerSetup({ userId }: SinglePlayerSetupProps) {
  const [numQuestions, setNumQuestions] = useState(10)
  const [timeLimit, setTimeLimit] = useState(30)
  const [category, setCategory] = useState("all")
  const [difficulty, setDifficulty] = useState("medium")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { supabase } = useSupabase()

  const handleStartGame = async () => {
    setLoading(true)
    try {
      // Create a new game session
      const { data: session, error: sessionError } = await supabase
        .from("game_sessions")
        .insert({
          creator_id: userId,
          is_multiplayer: false,
          time_limit: timeLimit,
          num_questions: numQuestions,
          category: category,
          difficulty: difficulty,
          status: "active",
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Add player to the session
      const { error: playerError } = await supabase.from("player_scores").insert({
        session_id: session.id,
        user_id: userId,
        score: 0,
        completed: false,
      })

      if (playerError) throw playerError

      // Redirect to the game
      router.push(`/play/${session.id}`)
    } catch (error) {
      console.error("Error starting game:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span>Game Settings</span>
          </CardTitle>
          <CardDescription>Configure your single player quiz experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="questions">Number of Questions</Label>
              <span className="text-sm font-medium">{numQuestions}</span>
            </div>
            <Slider
              id="questions"
              min={5}
              max={20}
              step={5}
              value={[numQuestions]}
              onValueChange={(value) => setNumQuestions(value[0])}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="time">Time Limit (seconds per question)</Label>
              <span className="text-sm font-medium">{timeLimit}s</span>
            </div>
            <Slider
              id="time"
              min={10}
              max={60}
              step={5}
              value={[timeLimit]}
              onValueChange={(value) => setTimeLimit(value[0])}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="science">Science</SelectItem>
                <SelectItem value="history">History</SelectItem>
                <SelectItem value="geography">Geography</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger id="difficulty">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleStartGame} disabled={loading}>
            {loading ? "Setting up..." : "Start Quiz"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <span>How to Play</span>
          </CardTitle>
          <CardDescription>Quick guide to single player mode</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Timed Questions</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Each question has a time limit. Answer before time runs out to earn points.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span>Scoring System</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Earn 10 XP for each correct answer. Accumulate 100 XP to level up.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium mb-2">Game Flow</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Configure your game settings</li>
              <li>Answer multiple-choice questions</li>
              <li>See your results and earned XP</li>
              <li>Track your progress on the dashboard</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

