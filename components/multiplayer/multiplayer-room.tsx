"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Copy, Users, MessageSquare, Settings, Crown, UserCheck } from "lucide-react"
import { MultiplayerChat } from "./multiplayer-chat"
import { MultiplayerGame } from "./multiplayer-game"
import { FriendsList } from "../friends/friends-list"
import { toast } from "@/components/ui/use-toast"

interface Room {
  id: string
  name: string
  creator_id: string
  max_players: number
  num_questions: number
  time_limit: number
  category: string
  difficulty: string
  status: string
  code: string
}

interface Player {
  id: string
  room_id: string
  user_id: string
  username: string
  is_ready: boolean
  is_creator: boolean
}

interface MultiplayerRoomProps {
  roomId: string
  userId: string
  username: string
}

export default function MultiplayerRoom({ roomId, userId, username }: MultiplayerRoomProps) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [isReady, setIsReady] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("lobby")
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { supabase } = useSupabase()

  // Fetch room and players data
  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        setLoading(true)
        // Get room details
        const { data: roomData, error: roomError } = await supabase.from("rooms").select("*").eq("id", roomId).single()

        if (roomError) throw roomError
        setRoom(roomData)

        // Check if game has started
        if (roomData.status === "active") {
          setGameStarted(true)
          setActiveTab("game")

          // Check if there's an active game session
          const { data: sessionData } = await supabase
            .from("game_sessions")
            .select("*")
            .eq("room_id", roomId)
            .eq("status", "active")
            .single()

          if (sessionData) {
            // Game is already in progress
            setGameStarted(true)
            setActiveTab("game")
          }
        }

        // Get players in the room
        const { data: playersData, error: playersError } = await supabase
          .from("room_players")
          .select("*")
          .eq("room_id", roomId)

        if (playersError) throw playersError
        setPlayers(playersData)

        // Check if current user is creator
        const currentPlayer = playersData.find((p) => p.user_id === userId)
        if (currentPlayer) {
          setIsReady(currentPlayer.is_ready)
          setIsCreator(currentPlayer.is_creator)

          // If user is creator and not ready, automatically mark as ready
          if (currentPlayer.is_creator && !currentPlayer.is_ready) {
            await supabase.from("room_players").update({ is_ready: true }).eq("room_id", roomId).eq("user_id", userId)

            setIsReady(true)
          }
        }
      } catch (error: any) {
        setError(error.message || "Failed to load room data")
      } finally {
        setLoading(false)
      }
    }

    fetchRoomData()

    // Set up realtime subscriptions
    const roomSubscription = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoom(payload.new as Room)
          if (payload.new.status === "active") {
            setGameStarted(true)
            setActiveTab("game")
            toast({
              title: "Game Started!",
              description: "The game has started. Good luck!",
              duration: 3000,
            })
          }
        },
      )
      .subscribe()

    // Improve the playersSubscription to be more specific
    const playersSubscription = supabase
      .channel(`room_players:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_players",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          // Refetch players when there's any change
          const { data } = await supabase.from("room_players").select("*").eq("room_id", roomId)
          if (data) {
            setPlayers(data)
            // Update local ready state if current user's state changed
            const currentPlayer = data.find((p) => p.user_id === userId)
            if (currentPlayer) {
              setIsReady(currentPlayer.is_ready)
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_players",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          // Refetch players when there's any change
          const { data } = await supabase.from("room_players").select("*").eq("room_id", roomId)
          if (data) {
            setPlayers(data)
            // Update local ready state if current user's state changed
            const currentPlayer = data.find((p) => p.user_id === userId)
            if (currentPlayer) {
              setIsReady(currentPlayer.is_ready)
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "room_players",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          // Refetch players when there's any change
          const { data } = await supabase.from("room_players").select("*").eq("room_id", roomId)
          if (data) {
            setPlayers(data)
          }
        },
      )
      .subscribe()

    const roomStatusSubscription = supabase
      .channel(`room-status:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId} AND status=eq.closed`,
        },
        () => {
          toast({
            title: "Room Closed",
            description: "The room host has closed this room.",
            duration: 3000,
          })
          router.push("/dashboard")
        },
      )
      .subscribe()

    return () => {
      roomSubscription.unsubscribe()
      playersSubscription.unsubscribe()
      roomStatusSubscription.unsubscribe() // Add this line
    }
  }, [roomId, userId, supabase])

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    toast({
      title: "Room ID Copied!",
      description: "Room ID has been copied to clipboard",
      duration: 2000,
    })
  }

  const handleToggleReady = async () => {
    try {
      const newReadyState = !isReady

      await supabase
        .from("room_players")
        .update({ is_ready: newReadyState })
        .eq("room_id", roomId)
        .eq("user_id", userId)

      setIsReady(newReadyState)

      toast({
        title: newReadyState ? "You're Ready!" : "You're Not Ready",
        description: newReadyState ? "Waiting for other players" : "Click Ready when you're prepared to play",
        duration: 2000,
      })
    } catch (error: any) {
      setError(error.message || "Failed to update ready status")
    }
  }

  const handleStartGame = async () => {
    if (!isCreator) return

    try {
      setLoading(true)

      // Check if all players are ready
      const notReadyPlayers = players.filter((p) => !p.is_ready)
      if (notReadyPlayers.length > 0) {
        setError("All players must be ready to start the game")
        setLoading(false)
        return
      }

      // Update room status
      await supabase.from("rooms").update({ status: "active" }).eq("id", roomId)

      // Create game session
      const { data: session, error: sessionError } = await supabase
        .from("game_sessions")
        .insert({
          creator_id: userId,
          is_multiplayer: true,
          room_id: roomId,
          time_limit: room?.time_limit || 30,
          num_questions: room?.num_questions || 10,
          category: room?.category || "all",
          difficulty: room?.difficulty || "medium",
          status: "active",
        })
        .select()

      if (sessionError) throw sessionError

      if (!session || session.length === 0) {
        throw new Error("Failed to create game session")
      }

      // Add all players to the session
      const playerScores = players.map((player) => ({
        session_id: session[0].id,
        user_id: player.user_id,
        score: 0,
        completed: false,
      }))

      await supabase.from("player_scores").insert(playerScores)

      setGameStarted(true)
      setActiveTab("game")
      setLoading(false)

      toast({
        title: "Game Started!",
        description: "The game has started. Good luck!",
        duration: 3000,
      })
    } catch (error: any) {
      setLoading(false)
      setError(error.message || "Failed to start game")
    }
  }

  const handleLeaveRoom = async () => {
    try {
      // Check if user is the creator
      if (isCreator) {
        // Show confirmation dialog
        if (
          !window.confirm("Are you sure you want to close this room? All players will be redirected to the dashboard.")
        ) {
          return
        }

        // Update room status to closed
        await supabase.from("rooms").update({ status: "closed" }).eq("id", roomId)

        // Delete the room_players entries
        await supabase.from("room_players").delete().eq("room_id", roomId)

        router.push("/dashboard")
      } else {
        // Show confirmation dialog for regular players
        if (!window.confirm("Are you sure you want to leave this room?")) {
          return
        }

        await supabase.from("room_players").delete().eq("room_id", roomId).eq("user_id", userId)
        router.push("/dashboard")
      }
    } catch (error: any) {
      setError(error.message || "Failed to leave room")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/10">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Loading Room...</h2>
              <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-8 w-48 bg-muted rounded"></div>
                <div className="h-4 w-64 bg-muted rounded"></div>
                <div className="h-24 w-full bg-muted rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/10">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Room not found</h2>
              <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      <div className="container mx-auto py-8 px-4">
        <Card className="mb-6 border-2 border-primary/20 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl text-primary">{room.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs font-semibold">
                    {room.difficulty.charAt(0).toUpperCase() + room.difficulty.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {room.category === "all"
                      ? "All Categories"
                      : room.category.charAt(0).toUpperCase() + room.category.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {room.num_questions} Questions
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded-md text-sm">
                  <span className="font-mono font-bold">{room.code}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      navigator.clipboard.writeText(room.code)
                      toast({
                        title: "Room Code Copied!",
                        description: "Room code has been copied to clipboard",
                        duration: 2000,
                      })
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLeaveRoom}
                  className="text-destructive hover:bg-destructive/10"
                >
                  Leave
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6 animate-shake">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 border-2 border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                <span>
                  Players ({players.length}/{room.max_players})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {players.map((player) => (
                  <div
                    key={player.user_id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {player.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium flex items-center gap-1">
                          {player.username}
                          {player.is_creator && <Crown className="h-3 w-3 text-yellow-500" />}
                        </p>
                        {player.is_creator && <span className="text-xs text-muted-foreground">Host</span>}
                      </div>
                    </div>
                    <Badge variant={player.is_ready ? "success" : "outline"} className="animate-pulse-slow">
                      {player.is_ready ? "Ready" : "Not Ready"}
                    </Badge>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                {!gameStarted && (
                  <>
                    {isCreator ? (
                      <Button
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md"
                        onClick={handleStartGame}
                        disabled={players.some((p) => !p.is_ready)}
                      >
                        Start Game
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${isReady ? "bg-muted hover:bg-muted/80" : "bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700"} shadow-md`}
                        variant={isReady ? "outline" : "default"}
                        onClick={handleToggleReady}
                      >
                        {isReady ? "Not Ready" : "Ready"}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-2 border-primary/20 shadow-lg">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="pb-0">
                <div className="flex justify-between items-center">
                  <TabsList className="bg-muted/70">
                    <TabsTrigger
                      value="lobby"
                      disabled={gameStarted}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger
                      value="game"
                      disabled={!gameStarted}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Game
                    </TabsTrigger>
                    <TabsTrigger
                      value="friends"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Friends
                    </TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <TabsContent value="lobby" className="mt-0">
                  <MultiplayerChat roomId={roomId} userId={userId} username={username} />
                </TabsContent>
                <TabsContent value="game" className="mt-0">
                  {gameStarted ? (
                    <MultiplayerGame roomId={roomId} userId={userId} username={username} />
                  ) : (
                    <div className="text-center py-12">
                      <h3 className="text-lg font-medium mb-2">Waiting for game to start</h3>
                      <p className="text-muted-foreground">The host will start the game once all players are ready</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="friends" className="mt-0">
                  <FriendsList userId={userId} roomId={roomId} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  )
}

