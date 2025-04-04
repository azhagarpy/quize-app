"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { Spinner } from "@/components/ui/spinner"

type SupabaseContext = {
  supabase: SupabaseClient
  user: User | null
  loading: boolean
  ensureProfile: (user: User) => Promise<void>
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()

  // Initialize Supabase client
  const supabase = createClientComponentClient()

  // Update the ensureProfile function to better handle the duplicate key error
  const ensureProfile = async (user: User) => {
    console.log(user, "ensureProfile called")
    try {
      // First check if profile exists
      const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", user.id).single()

      // If profile already exists, no need to create it
      if (existingProfile) {
        return
      }

      // Add a delay to ensure auth user is fully created
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Try to create the profile with upsert to handle potential race conditions
      const username = user.user_metadata?.username || `user_${user.id.substring(0, 8)}`

      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          username,
          experience: 0,
          level: 1,
        },
        { onConflict: "id", ignoreDuplicates: true },
      )

      if (error) {
        // If it's not a duplicate key error, log it
        if (error.code !== "23505") {
          // PostgreSQL duplicate key error code
          console.error("Error creating profile:", error)
        }
      }
    } catch (error) {
      console.error("Error in ensureProfile:", error)
    }
  }
  useEffect(() => {
    const getSession = async () => {
      console.log("called getSession");
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log(session, "********");
        console.log(session?.user, "********");
  
        if (session?.user) {
          setUser(session.user);
          // Ensure profile exists
          await ensureProfile(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };
  
    getSession();
  
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          // Ensure profile exists
          await ensureProfile(session.user);
        } else {
          setUser(null);
        }
  
        router.refresh();
      }
    );
  
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [router, supabase]);
  

  console.log("isInitialized",isInitialized);
  // Provide a loading state while the provider is initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    )
  }

  return <Context.Provider value={{ supabase, user, loading, ensureProfile }}>{children}</Context.Provider>
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider")
  }
  return context
}

