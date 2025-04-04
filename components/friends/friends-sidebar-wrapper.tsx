"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { FriendsSidebar } from "./friends-sidebar"

export function FriendsSidebarWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSupabase()
  const pathname = usePathname()
  const [roomId, setRoomId] = useState<string | undefined>(undefined)

  // Extract room ID from pathname if in a room
  useEffect(() => {
    if (pathname.startsWith("/room/")) {
      const id = pathname.split("/")[2]
      setRoomId(id)
    } else {
      setRoomId(undefined)
    }
  }, [pathname])

  return (
    <div className="relative">
      {children}
      {user && !loading && <FriendsSidebar userId={user.id} roomId={roomId} />}
    </div>
  )
}

