"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Search, UserCheck, UserX, Mail, X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { calculateRank } from "@/utils/rank"

interface Friend {
  id: string
  user_id: string
  friend_id: string
  status: string
  created_at: string
  friend_username: string
  friend_experience: number
  is_online: boolean
  last_seen: string | null
}

interface FriendRequest {
  id: string
  user_id: string
  friend_id: string
  status: string
  created_at: string
  username: string
}

export function FriendsSidebar({ userId, roomId }: { userId: string; roomId?: string }) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("online")
  const [isOpen, setIsOpen] = useState(false)
  const { supabase } = useSupabase()

  // Fetch friends and pending requests
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setLoading(true)

        // Fetch accepted friends with their profile information
        const { data: friendsData, error: friendsError } = await supabase
          .from("friends")
          .select(`
            id,
            user_id,
            friend_id,
            status,
            created_at,
            profiles!friends_friend_id_fkey(username, experience)
          `)
          .eq("user_id", userId)
          .eq("status", "accepted")
          .order("created_at", { ascending: false })

        if (friendsError) throw friendsError

        // Fetch online status for all friends
        const friendIds = friendsData.map((friend) => friend.friend_id)

        // Only fetch online status if we have friends
        let onlineStatusData: any[] = []
        if (friendIds.length > 0) {
          const { data: statusData, error: statusError } = await supabase
            .from("online_status")
            .select("*")
            .in("user_id", friendIds)

          if (statusError) throw statusError
          onlineStatusData = statusData || []
        }

        // Format friends data with online status
        const formattedFriends = friendsData.map((friend) => {
          const onlineStatus = onlineStatusData.find((status) => status.user_id === friend.friend_id)
          return {
            id: friend.id,
            user_id: friend.user_id,
            friend_id: friend.friend_id,
            status: friend.status,
            created_at: friend.created_at,
            friend_username: friend.profiles.username,
            friend_experience: friend.profiles.experience,
            is_online: onlineStatus?.is_online || false,
            last_seen: onlineStatus?.last_seen || null,
          }
        })

        setFriends(formattedFriends)

        // Fetch pending friend requests
        const { data: requestsData, error: requestsError } = await supabase
          .from("friends")
          .select(`
            id,
            user_id,
            friend_id,
            status,
            created_at,
            profiles!friends_user_id_fkey(username)
          `)
          .eq("friend_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })

        if (requestsError) throw requestsError

        // Format requests data
        const formattedRequests = requestsData.map((request) => ({
          id: request.id,
          user_id: request.user_id,
          friend_id: request.friend_id,
          status: request.status,
          created_at: request.created_at,
          username: request.profiles.username,
        }))

        setPendingRequests(formattedRequests)
      } catch (error) {
        console.error("Error fetching friends:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFriends()

    // Set up realtime subscriptions for friends
    const friendsSubscription = supabase
      .channel("friends-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friends",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchFriends(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friends",
          filter: `friend_id=eq.${userId}`,
        },
        () => fetchFriends(),
      )
      .subscribe()

    // Set up realtime subscriptions for online status
    const onlineStatusSubscription = supabase
      .channel("online-status-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "online_status",
        },
        () => fetchFriends(),
      )
      .subscribe()

    return () => {
      friendsSubscription.unsubscribe()
      onlineStatusSubscription.unsubscribe()
    }
  }, [userId, supabase])

  // Update user's online status
  useEffect(() => {
    const updateOnlineStatus = async () => {
      try {
        // Check if user has an online status record
        const { data: existingStatus } = await supabase.from("online_status").select("*").eq("user_id", userId).single()

        if (existingStatus) {
          // Update existing record
          await supabase
            .from("online_status")
            .update({ is_online: true, last_seen: new Date().toISOString() })
            .eq("user_id", userId)
        } else {
          // Create new record
          await supabase.from("online_status").insert({ user_id: userId, is_online: true })
        }

        // Set up interval to update last_seen
        const interval = setInterval(async () => {
          await supabase.from("online_status").update({ last_seen: new Date().toISOString() }).eq("user_id", userId)
        }, 60000) // Update every minute

        // Set up beforeunload event to mark user as offline
        const handleBeforeUnload = async () => {
          await supabase
            .from("online_status")
            .update({ is_online: false, last_seen: new Date().toISOString() })
            .eq("user_id", userId)
        }

        window.addEventListener("beforeunload", handleBeforeUnload)

        return () => {
          clearInterval(interval)
          window.removeEventListener("beforeunload", handleBeforeUnload)
        }
      } catch (error) {
        console.error("Error updating online status:", error)
      }
    }

    updateOnlineStatus()
  }, [userId, supabase])

  // Search for users
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, experience")
        .ilike("username", `%${searchQuery}%`)
        .neq("id", userId) // Don't include current user
        .limit(10)

      if (error) throw error

      // Check if users are already friends or have pending requests
      const friendIds = friends.map((friend) => friend.friend_id)
      const pendingIds = pendingRequests.map((request) => request.user_id)

      // Also check for outgoing requests
      const { data: outgoingRequests } = await supabase
        .from("friends")
        .select("friend_id")
        .eq("user_id", userId)
        .eq("status", "pending")

      const outgoingIds = outgoingRequests?.map((request) => request.friend_id) || []

      // Filter out existing friends and requests
      const filteredResults = data.map((user) => ({
        ...user,
        isFriend: friendIds.includes(user.id),
        hasPendingRequest: pendingIds.includes(user.id),
        hasOutgoingRequest: outgoingIds.includes(user.id),
      }))

      setSearchResults(filteredResults)
    } catch (error) {
      console.error("Error searching users:", error)
    }
  }

  // Send friend request
  const sendFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase.from("friends").insert({
        user_id: userId,
        friend_id: friendId,
        status: "pending",
      })

      if (error) throw error

      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent successfully.",
        duration: 3000,
      })

      // Update search results
      setSearchResults((prev) =>
        prev.map((user) => (user.id === friendId ? { ...user, hasOutgoingRequest: true } : user)),
      )
    } catch (error) {
      console.error("Error sending friend request:", error)
      toast({
        title: "Error",
        description: "Failed to send friend request. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Accept friend request
  const acceptFriendRequest = async (requestId: string, friendId: string) => {
    try {
      const { error } = await supabase.from("friends").update({ status: "accepted" }).eq("id", requestId)

      if (error) throw error

      toast({
        title: "Friend Request Accepted",
        description: "You are now friends!",
        duration: 3000,
      })

      // Remove from pending requests
      setPendingRequests((prev) => prev.filter((request) => request.id !== requestId))
    } catch (error) {
      console.error("Error accepting friend request:", error)
      toast({
        title: "Error",
        description: "Failed to accept friend request. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Reject friend request
  const rejectFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.from("friends").delete().eq("id", requestId)

      if (error) throw error

      toast({
        title: "Friend Request Rejected",
        description: "The friend request has been rejected.",
        duration: 3000,
      })

      // Remove from pending requests
      setPendingRequests((prev) => prev.filter((request) => request.id !== requestId))
    } catch (error) {
      console.error("Error rejecting friend request:", error)
      toast({
        title: "Error",
        description: "Failed to reject friend request. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Invite friend to room
  const inviteFriendToRoom = async (friendId: string, friendUsername: string) => {
    if (!roomId) return

    try {
      // Create a notification in the database
      const { error } = await supabase.from("notifications").insert({
        user_id: friendId,
        type: "room_invite",
        content: `You've been invited to join a quiz room`,
        data: { roomId },
        is_read: false,
      })

      if (error) throw error

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${friendUsername}`,
        duration: 3000,
      })
    } catch (error) {
      console.error("Error inviting friend:", error)
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Format time since last seen
  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return "Unknown"

    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffMs = now.getTime() - lastSeenDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hr ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  }

  // Filter friends based on online status
  const onlineFriends = friends.filter((friend) => friend.is_online)
  const offlineFriends = friends.filter((friend) => !friend.is_online)

  return (
    <div className="fixed right-0 top-0 h-screen z-50">
      <div
        className={`transition-all duration-300 ease-in-out h-full ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="bg-background border-l border-border h-full w-80 shadow-xl flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Friends
              {pendingRequests.length > 0 && <Badge className="ml-1 bg-primary">{pendingRequests.length}</Badge>}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 border-b">
            <div className="flex gap-2">
              <Input
                placeholder="Search for users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-2 focus:border-primary/50"
              />
              <Button variant="outline" size="icon" onClick={handleSearch} className="border-2 hover:border-primary/50">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 mt-2">
                <h3 className="text-sm font-medium">Search Results</h3>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {searchResults.map((user) => {
                    const rankInfo = calculateRank(user.experience)
                    return (
                      <div key={user.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border-2 border-primary/20">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {user.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <Badge className={`${rankInfo.color} bg-opacity-20 text-xs`}>
                              {rankInfo.icon} {rankInfo.name}
                            </Badge>
                          </div>
                        </div>
                        {user.isFriend ? (
                          <Badge variant="outline">Friend</Badge>
                        ) : user.hasPendingRequest ? (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            Pending
                          </Badge>
                        ) : user.hasOutgoingRequest ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            Request Sent
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => sendFriendRequest(user.id)}
                            className="text-primary hover:text-primary-foreground hover:bg-primary"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Friend requests */}
          {pendingRequests.length > 0 && (
            <div className="p-4 border-b">
              <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-primary" />
                Friend Requests
                <Badge className="ml-auto bg-primary">{pendingRequests.length}</Badge>
              </h3>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 animate-pulse-slow"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {request.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{request.username}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => acceptFriendRequest(request.id, request.user_id)}
                        className="text-green-600 hover:text-green-50 hover:bg-green-600"
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => rejectFriendRequest(request.id)}
                        className="text-red-600 hover:text-red-50 hover:bg-red-600"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends list */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 bg-muted/70 px-4 pt-4">
                <TabsTrigger
                  value="online"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Online ({onlineFriends.length})
                </TabsTrigger>
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  All Friends ({friends.length})
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden p-4">
                <TabsContent value="online" className="h-full overflow-y-auto">
                  {onlineFriends.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No friends online</div>
                  ) : (
                    <div className="space-y-2">
                      {onlineFriends.map((friend) => {
                        const rankInfo = calculateRank(friend.friend_experience)
                        return (
                          <div key={friend.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <Avatar className="h-8 w-8 border-2 border-primary/20">
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {friend.friend_username.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border border-white"></div>
                              </div>
                              <div>
                                <p className="font-medium">{friend.friend_username}</p>
                                <Badge className={`${rankInfo.color} bg-opacity-20 text-xs`}>
                                  {rankInfo.icon} {rankInfo.name}
                                </Badge>
                              </div>
                            </div>
                            {roomId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => inviteFriendToRoom(friend.friend_id, friend.friend_username)}
                                className="text-primary hover:text-primary-foreground hover:bg-primary"
                              >
                                Invite
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="all" className="h-full overflow-y-auto">
                  {friends.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No friends yet</div>
                  ) : (
                    <div className="space-y-2">
                      {friends.map((friend) => {
                        const rankInfo = calculateRank(friend.friend_experience)
                        return (
                          <div key={friend.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <Avatar className="h-8 w-8 border-2 border-primary/20">
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {friend.friend_username.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {friend.is_online ? (
                                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border border-white"></div>
                                ) : (
                                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-gray-400 border border-white"></div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{friend.friend_username}</p>
                                <div className="flex items-center gap-2">
                                  <Badge className={`${rankInfo.color} bg-opacity-20 text-xs`}>
                                    {rankInfo.icon} {rankInfo.name}
                                  </Badge>
                                  {!friend.is_online && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatLastSeen(friend.last_seen)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {roomId && friend.is_online && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => inviteFriendToRoom(friend.friend_id, friend.friend_username)}
                                className="text-primary hover:text-primary-foreground hover:bg-primary"
                              >
                                Invite
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <Button
        variant="outline"
        size="sm"
        className={`absolute top-1/2 -translate-y-1/2 ${isOpen ? "right-80" : "right-0"} -translate-x-full bg-background border border-r-0 rounded-r-none h-10`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <UserCheck className="h-5 w-5" />
            {pendingRequests.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-primary">
                {pendingRequests.length}
              </Badge>
            )}
          </>
        )}
      </Button>
    </div>
  )
}

