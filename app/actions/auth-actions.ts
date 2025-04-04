"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Define environment variables with default values for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project-url.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key"

export async function createUserProfile(userId: string, username: string) {
  const supabase = createServerActionClient({
    cookies,
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  try {
    // Add a small delay to ensure the auth user is fully created
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Check if profile already exists
    const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", userId).single()

    if (existingProfile) {
      return { success: true, message: "Profile already exists" }
    }

    // Use upsert with onConflict to handle potential race conditions
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        username,
        experience: 0,
        level: 1,
      },
      { onConflict: "id", ignoreDuplicates: true },
    )

    if (error) {
      console.error("Server action profile creation error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Server action error:", error)
    return { success: false, error: error.message || "An unknown error occurred" }
  }
}

