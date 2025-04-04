import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      // Add a small delay to ensure the auth user is fully created
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check if profile exists
      const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).single()

      // If profile doesn't exist, create it
      if (!profile) {
        const username = data.user.user_metadata?.username || `user_${data.user.id.substring(0, 8)}`

        // Use upsert with onConflict to handle potential race conditions
        await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            username,
            experience: 0,
            level: 1,
          },
          { onConflict: "id", ignoreDuplicates: true },
        )
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL("/dashboard", request.url))
}

