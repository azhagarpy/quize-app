"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { PlayCircle, Users, Plus, LogOut, UserCheck } from "lucide-react"
import { SinglePlayerSetup } from "./single-player-setup"
import { JoinRoom } from "./join-room"
import { CreateRoom } from "./create-room"
import { FriendsList } from "../friends/friends-list"
import { DashboardSkeleton } from "@/components/ui/loading-skeletons"
import { calculateRank, getNextRank, calculateRankProgress } from "@/utils/rank"
import { Badge } from "@/components/ui/badge"

interface Profile {
  id: string
  username: string
  experience: number
  level: number
}

export default function Dashboard({ profile }: { profile: Profile }) {
  const [activeTab, setActiveTab] = useState("play")
  const router = useRouter()
  const { supabase, user, loading } = useSupabase()

  // If the supabase context is still loading, show a loading state
  if (loading) {
    return <DashboardSkeleton />
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  // Calculate rank information
  const rankInfo = calculateRank(profile.experience)
  const nextRank = getNextRank(profile.experience)
  const rankProgress = calculateRankProgress(profile.experience)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Quize</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10 border-2 border-primary/30">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{profile.username}</p>
                  <Badge className={`${rankInfo.color} bg-opacity-20 text-xs`}>
                    {rankInfo.icon} {rankInfo.name}
                  </Badge>
                </div>
                {nextRank && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Next: {nextRank.name}</span>
                    <Progress value={rankProgress} className="h-1 w-20" />
                    <span className="text-xs text-muted-foreground">{rankProgress}%</span>
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-muted/70">
            <TabsTrigger
              value="play"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <PlayCircle className="h-4 w-4" />
              <span>Play Now</span>
            </TabsTrigger>
            <TabsTrigger
              value="join"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-4 w-4" />
              <span>Join Room</span>
            </TabsTrigger>
            <TabsTrigger
              value="create"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>Create Room</span>
            </TabsTrigger>
            <TabsTrigger
              value="friends"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <UserCheck className="h-4 w-4" />
              <span>Friends</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="play">
            <SinglePlayerSetup userId={profile.id} />
          </TabsContent>

          <TabsContent value="join">
            <JoinRoom userId={profile.id} username={profile.username} />
          </TabsContent>

          <TabsContent value="create">
            <CreateRoom userId={profile.id} username={profile.username} />
          </TabsContent>

          <TabsContent value="friends">
            <FriendsList userId={profile.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

