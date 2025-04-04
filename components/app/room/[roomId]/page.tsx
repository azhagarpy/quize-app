import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import MultiplayerRoom from "@/components/multiplayer/multiplayer-room"
import { Suspense } from "react"
import { RoomSkeleton } from "@/components/ui/loading-skeletons"

export default async function RoomPage({ params }: { params: { roomId: string } }) {
  // Properly await cookies
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // Use getUser instead of getSession for better security
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/")
  }

  // Ensure params.roomId is properly awaited by using it in an awaited context
  const roomId = params.roomId
  console.log(roomId,"***********************")
  // Fetch room details
  const { data: room } = await supabase.from("rooms").select("*").eq("id", roomId).single()

  if (!room) {
    redirect("/dashboard")
  }

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    return <RoomSkeleton />
  }

  return (
    <Suspense fallback={<RoomSkeleton />}>
      <MultiplayerRoom roomId={roomId} userId={user.id} username={profile.username} />
    </Suspense>
  )
}

