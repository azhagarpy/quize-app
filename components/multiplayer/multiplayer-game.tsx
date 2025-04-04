"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, Trophy } from "lucide-react"
import { QuizQuestion } from "../game/quiz-question"
import { QuizResults } from "../game/quiz-results"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface Question {
  id: string
  question: string
  options: string[]
  correct_answer: string
  category: string
  difficulty: string
}

interface GameSession {
  id: string
  creator_id: string
  room_id: string
  is_multiplayer: boolean
  time_limit: number
  num_questions: number
  category: string
  difficulty: string
  status: string
}

interface PlayerScore {
  id: string
  session_id: string
  user_id: string
  score: number
  completed: boolean
}

interface MultiplayerGameProps {
  roomId: string
  userId: string
  username: string
}

export function MultiplayerGame({ roomId, userId, username }: MultiplayerGameProps) {
  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [gameOver, setGameOver] = useState(false)
  const [expGained, setExpGained] = useState(0)
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([])
  const [playerUsernames, setPlayerUsernames] = useState<Record<string, string>>({})
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { supabase } = useSupabase()

  // Fetch game session, questions, and player data
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true)
        // Get active game session for this room
        const { data: sessionData, error: sessionError } = await supabase
          .from("game_sessions")
          .select("*")
          .eq("room_id", roomId)
          .eq("status", "active")
          .single()
          console.log(roomId,sessionData)
        if (sessionError) throw sessionError
        setGameSession(sessionData)
        setTimeLeft(sessionData.time_limit)

        // Get questions for the session
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select("*")
          // .eq("category", sessionData.category === "all" ? "%" : sessionData.category)
          .eq("difficulty", sessionData.difficulty)
          .limit(sessionData.num_questions)

          console.log(questions,"*(((((")

        if (questionsError) throw questionsError
        setQuestions(questionsData || [])

        // Get player scores
        const { data: scoresData, error: scoresError } = await supabase
          .from("player_scores")
          .select("*")
          .eq("session_id", sessionData.id)

        if (scoresError) throw scoresError
        setPlayerScores(scoresData || [])

        // Get player usernames
        const { data: playersData, error: playersError } = await supabase
          .from("room_players")
          .select("user_id, username")
          .eq("room_id", roomId)

        if (playersError) throw playersError

        const usernamesMap: Record<string, string> = {}
        playersData.forEach((player) => {
          usernamesMap[player.user_id] = player.username
        })
        setPlayerUsernames(usernamesMap)

        // Get user profile
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single()

        setProfile(profileData)
      } catch (error) {
        console.error("Error fetching game data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchGameData()

    // Subscribe to player scores updates
    const scoresSubscription = supabase
      .channel(`player_scores:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "player_scores",
        },
        async (payload) => {
          // Refetch all scores when any score changes
          const { data } = await supabase.from("player_scores").select("*").eq("session_id", payload.new.session_id)

          if (data) setPlayerScores(data)
        },
      )
      .subscribe()

    return () => {
      scoresSubscription.unsubscribe()
    }
  }, [roomId, userId, supabase])

  // Timer effect
  useEffect(() => {
    if (!gameSession || gameOver || questions.length === 0 || loading) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleNextQuestion()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentQuestionIndex, gameSession, gameOver, questions, loading])

  const handleAnswer = (answer: string) => {
    if (!gameSession) return

    const currentQuestion = questions[currentQuestionIndex]
    const isCorrect = answer === currentQuestion.correct_answer

    if (isCorrect) {
      const newScore = score + 10
      setScore(newScore)
      setExpGained((prev) => prev + 10)

      // Update score in database
      supabase.from("player_scores").update({ score: newScore }).eq("session_id", gameSession.id).eq("user_id", userId)
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }))

    setTimeout(() => {
      handleNextQuestion()
    }, 1000)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setTimeLeft(gameSession?.time_limit || 30)
    } else {
      endGame()
    }
  }

  const endGame = async () => {
    if (!gameSession) return

    setGameOver(true)

    try {
      // Mark player as completed
      await supabase
        .from("player_scores")
        .update({
          completed: true,
        })
        .eq("session_id", gameSession.id)
        .eq("user_id", userId)

      // Update user experience
      if (profile) {
        const newExperience = profile.experience + expGained
        const newLevel = Math.floor(newExperience / 100) + 1

        await supabase
          .from("profiles")
          .update({
            experience: newExperience,
            level: newLevel,
          })
          .eq("id", userId)
      }

      // Check if all players have completed
      const { data: completedData } = await supabase
        .from("player_scores")
        .select("*")
        .eq("session_id", gameSession.id)
        .eq("completed", false)

      if (!completedData || completedData.length === 0) {
        // All players have completed, update game session status
        await supabase
          .from("game_sessions")
          .update({
            status: "completed",
          })
          .eq("id", gameSession.id)

        // Update room status
        await supabase
          .from("rooms")
          .update({
            status: "completed",
          })
          .eq("id", roomId)
      }
    } catch (error) {
      console.error("Error ending game:", error)
    }
  }

  const handleReturnToDashboard = () => {
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>

          <Skeleton className="h-2 w-full mb-6" />

          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-2 w-full mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Skeleton className="h-6 w-32 mb-3" />
          <div className="space-y-2">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
          </div>
        </div>
      </div>
    )
  }

  if (!gameSession || questions.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">Loading game...</h3>
      </div>
    )
  }

  if (gameOver) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
          <div className="space-y-2">
            {playerScores
              .sort((a, b) => b.score - a.score)
              .map((playerScore, index) => (
                <div
                  key={playerScore.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    playerScore.user_id === userId ? "bg-primary/10" : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-sm font-medium">
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {playerUsernames[playerScore.user_id]?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{playerUsernames[playerScore.user_id] || "Unknown Player"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="font-bold">{playerScore.score}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {profile && (
          <QuizResults
            score={score}
            totalQuestions={questions.length}
            expGained={expGained}
            onReturnToDashboard={handleReturnToDashboard}
            profile={profile}
          />
        )}
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const timeProgress = (timeLeft / gameSession.time_limit) * 100

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm px-3 py-1">
              Question {currentQuestionIndex + 1} of {questions.length}
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {gameSession.difficulty.charAt(0).toUpperCase() + gameSession.difficulty.slice(1)}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-medium">{score}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-medium">{timeLeft}s</span>
            </div>
          </div>
        </div>

        <Progress value={progress} className="h-2 mb-6" />

        <QuizQuestion
          question={currentQuestion}
          onAnswer={handleAnswer}
          timeLeft={timeLeft}
          totalTime={gameSession.time_limit}
          selectedAnswer={answers[currentQuestion.id]}
        />
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold mb-3">Live Scores</h3>
        <div className="space-y-2">
          {playerScores
            .sort((a, b) => b.score - a.score)
            .map((playerScore) => (
              <div
                key={playerScore.id}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  playerScore.user_id === userId ? "bg-primary/10" : "bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>
                      {playerUsernames[playerScore.user_id]?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{playerUsernames[playerScore.user_id] || "Unknown Player"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="font-bold">{playerScore.score}</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

