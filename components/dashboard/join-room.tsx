"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Users } from "lucide-react"

interface JoinRoomProps {
  userId: string
  username: string
}

export function JoinRoom({ userId, username }: JoinRoomProps) {
  const [roomCode, setRoomCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { supabase } = useSupabase()

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      setError("Please enter a room code")
      return
    }

    setError(null)
    setLoading(true)

    try {
      // Check if room exists and is accepting players
      const { data: rooms, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", roomCode)
        .eq("status", "waiting")

      if (roomError) throw roomError

      if (!rooms || rooms.length === 0) {
        throw new Error("Room not found or no longer accepting players")
      }

      const room = rooms[0]

      // Check if player is already in the room
      const { data: existingPlayers, error: playerCheckError } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", room.id)
        .eq("user_id", userId)

      if (playerCheckError) throw playerCheckError

      if (existingPlayers && existingPlayers.length > 0) {
        // Player is already in the room, just redirect
        router.push(`/room/${room.id}`)
        return
      }

      // Check if room is full
      const { count, error: countError } = await supabase
        .from("room_players")
        .select("*", { count: "exact" })
        .eq("room_id", room.id)

      if (countError) throw countError

      if (count && count >= room.max_players) {
        throw new Error("Room is full")
      }

      // Add player to room
      const { error: joinError } = await supabase.from("room_players").insert({
        room_id: room.id,
        user_id: userId,
        username: username,
        is_ready: false,
      })

      if (joinError) throw joinError

      // Redirect to room
      router.push(`/room/${room.id}`)
    } catch (error: any) {
      setError(error.message || "Failed to join room")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="game-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Join a Room</span>
          </CardTitle>
          <CardDescription>Enter a room code to join a multiplayer quiz</CardDescription>
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
              <Label htmlFor="roomCode">Room Code</Label>
              <Input
                id="roomCode"
                placeholder="Enter 6-digit room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="border-2 focus:border-primary/50 text-center text-2xl tracking-widest font-mono"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code provided by the room creator
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full game-shadow bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700"
            onClick={handleJoinRoom}
            disabled={loading || roomCode.length !== 6}
          >
            {loading ? "Joining..." : "Join Room"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

