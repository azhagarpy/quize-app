"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, Trophy } from "lucide-react"
import { QuizQuestion } from "./quiz-question"
import { QuizResults } from "./quiz-results"
import confetti from "canvas-confetti"
import { QuizSkeleton } from "@/components/ui/loading-skeletons"

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
  is_multiplayer: boolean
  time_limit: number
  num_questions: number
  category: string
  difficulty: string
  status: string
}

interface Profile {
  id: string
  username: string
  experience: number
  level: number
}

interface QuizGameProps {
  session: GameSession
  questions: Question[]
  userId: string
  profile: Profile
}

export default function QuizGame({ session, questions, userId, profile }: QuizGameProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(session.time_limit)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [gameOver, setGameOver] = useState(false)
  const [expGained, setExpGained] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { supabase } = useSupabase()

  useEffect(() => {
    // Simulate loading time for questions
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100

  useEffect(() => {
    if (!currentQuestion || gameOver || loading) return

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
  }, [currentQuestionIndex, currentQuestion, gameOver, loading])

  const handleAnswer = (answer: string) => {
    const isCorrect = answer === currentQuestion.correct_answer

    if (isCorrect) {
      setScore((prev) => prev + 10)
      setExpGained((prev) => prev + 10)

      // Show confetti for correct answers
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
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
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setTimeLeft(session.time_limit)
    } else {
      endGame()
    }
  }

  const endGame = async () => {
    setGameOver(true)

    try {
      // Update player score
      await supabase
        .from("player_scores")
        .update({
          score: score,
          completed: true,
        })
        .eq("session_id", session.id)
        .eq("user_id", userId)

      // Update user experience
      const newExperience = profile.experience + expGained
      const newLevel = Math.floor(newExperience / 100) + 1

      await supabase
        .from("profiles")
        .update({
          experience: newExperience,
          level: newLevel,
        })
        .eq("id", userId)

      // Update game session status
      await supabase
        .from("game_sessions")
        .update({
          status: "completed",
        })
        .eq("id", session.id)
    } catch (error) {
      console.error("Error ending game:", error)
    }
  }

  const handleReturnToDashboard = () => {
    router.push("/dashboard")
  }

  if (loading) {
    return <QuizSkeleton />
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">No Questions Available</h2>
              <p className="mb-6">There are no questions available for the selected category and difficulty.</p>
              <Button onClick={handleReturnToDashboard}>Return to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (gameOver) {
    return (
      <QuizResults
        score={score}
        totalQuestions={totalQuestions}
        expGained={expGained}
        onReturnToDashboard={handleReturnToDashboard}
        profile={profile}
      />
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/10 p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm px-3 py-1">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {session.difficulty.charAt(0).toUpperCase() + session.difficulty.slice(1)}
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {session.category === "all"
                ? "All Categories"
                : session.category.charAt(0).toUpperCase() + session.category.slice(1)}
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
          totalTime={session.time_limit}
          selectedAnswer={answers[currentQuestion.id]}
        />
      </div>
    </div>
  )
}

