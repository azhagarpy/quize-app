"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus } from "lucide-react"
import { v4 as uuidv4 } from "uuid"

interface CreateRoomProps {
  userId: string
  username: string
}

export function CreateRoom({ userId, username }: CreateRoomProps) {
  const [roomName, setRoomName] = useState("")
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [numQuestions, setNumQuestions] = useState(10)
  const [timeLimit, setTimeLimit] = useState(30)
  const [category, setCategory] = useState("all")
  const [difficulty, setDifficulty] = useState("medium")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { supabase } = useSupabase()

  // Generate a 6-digit room code
  const generateRoomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError("Please enter a room name")
      return
    }

    setError(null)
    setLoading(true)

    try {
      // Generate a 6-digit room code
      const roomCode = generateRoomCode()
      const roomId = uuidv4() // Use UUID for database ID

      // Create a new room
      const { error: roomError } = await supabase.from("rooms").insert({
        id: roomId,
        code: roomCode,
        name: roomName,
        creator_id: userId,
        max_players: maxPlayers,
        num_questions: numQuestions,
        time_limit: timeLimit,
        category: category,
        difficulty: difficulty,
        status: "waiting",
      })

      if (roomError) throw roomError

      // Add creator as first player
      const { error: playerError } = await supabase.from("room_players").insert({
        room_id: roomId,
        user_id: userId,
        username: username,
        is_ready: false,
        is_creator: true,
      })

      if (playerError) throw playerError

      // Redirect to room
      router.push(`/room/${roomId}`)
    } catch (error: any) {
      setError(error.message || "Failed to create room")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="game-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <span>Create a Room</span>
          </CardTitle>
          <CardDescription>Set up a multiplayer quiz room for friends to join</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 animate-shake">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomName">Room Name</Label>
              <Input
                id="roomName"
                placeholder="My Quiz Room"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="border-2 focus:border-primary/50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="maxPlayers">Max Players</Label>
                <span className="text-sm font-medium">{maxPlayers}</span>
              </div>
              <Slider
                id="maxPlayers"
                min={2}
                max={8}
                step={1}
                value={[maxPlayers]}
                onValueChange={(value) => setMaxPlayers(value[0])}
              />
            </div>

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
                <SelectTrigger id="category" className="border-2 focus:border-primary/50">
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
                <SelectTrigger id="difficulty" className="border-2 focus:border-primary/50">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full game-shadow bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700"
            onClick={handleCreateRoom}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Room"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

