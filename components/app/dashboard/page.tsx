import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import Dashboard from "@/components/dashboard/dashboard"
import { Suspense } from "react"
import { DashboardSkeleton } from "@/components/ui/loading-skeletons"

export default async function DashboardPage() {
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

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    // Handle case where profile doesn't exist yet
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Setting up your profile...</h2>
          <DashboardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard profile={profile} />
    </Suspense>
  )
}

