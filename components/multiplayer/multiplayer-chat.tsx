"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Smile } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"

interface Message {
  id: string
  room_id: string
  user_id: string
  username: string
  content: string
  created_at: string
}

interface MultiplayerChatProps {
  roomId: string
  userId: string
  username: string
}

export function MultiplayerChat({ roomId, userId, username }: MultiplayerChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { supabase } = useSupabase()

  // Fetch existing messages
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true })

        if (data) setMessages(data)
      } catch (error) {
        console.error("Error fetching messages:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Subscribe to new messages
    const subscription = supabase
      .channel(`chat:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [roomId, supabase])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    try {
      await supabase.from("chat_messages").insert({
        room_id: roomId,
        user_id: userId,
        username: username,
        content: newMessage,
      })

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const addEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
  }

  // Common emojis
  const emojis = ["😀", "😂", "🙌", "👍", "❤️", "🎮", "🧠", "🤔", "👏", "🔥", "🎉", "🏆"]

  if (loading) {
    return (
      <div className="flex flex-col h-[400px]">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {Array(5)
            .fill(0)
            .map((_, i) => (
              <div key={i} className={`flex items-start gap-2 ${i % 2 === 0 ? "" : "justify-end"}`}>
                {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
                <Skeleton className={`h-16 w-[80%] rounded-lg`} />
                {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full" />}
              </div>
            ))}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${message.user_id === userId ? "justify-end" : ""}`}
            >
              {message.user_id !== userId && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{message.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  message.user_id === userId ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {message.user_id !== userId && <p className="font-medium text-xs mb-1">{message.username}</p>}
                <p>{message.content}</p>
              </div>
              {message.user_id === userId && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{message.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" type="button">
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-2" align="start">
            <div className="grid grid-cols-6 gap-2">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="text-lg hover:bg-muted rounded p-1"
                  onClick={() => addEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={!newMessage.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}

