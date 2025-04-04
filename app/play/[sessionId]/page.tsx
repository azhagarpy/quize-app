import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import QuizGame from "@/components/game/quiz-game"
import { Suspense } from "react"
import { QuizSkeleton } from "@/components/ui/loading-skeletons"

export default async function PlayPage({ params }: { params: { sessionId: string } }) {
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

  // Fetch game session
  const { data: gameSession } = await supabase.from("game_sessions").select("*").eq("id", params.sessionId).single()

  if (!gameSession) {
    redirect("/dashboard")
  }

  // Fetch questions for the session
  let questionsQuery = supabase
    .from("questions")
    .select("*")
    .eq("difficulty", gameSession.difficulty)
    .limit(gameSession.num_questions)

  // Only filter by category if it's not "all"
  if (gameSession.category !== "all") {
    questionsQuery = questionsQuery.eq("category", gameSession.category)
  }

  const { data: questions } = await questionsQuery

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    return <QuizSkeleton />
  }

  return (
    <Suspense fallback={<QuizSkeleton />}>
      <QuizGame session={gameSession} questions={questions || []} userId={user.id} profile={profile} />
    </Suspense>
  )
}

