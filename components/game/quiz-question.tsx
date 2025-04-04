"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle } from "lucide-react"

interface Question {
  id: string
  question: string
  options: string[]
  correct_answer: string
}

interface QuizQuestionProps {
  question: Question
  onAnswer: (answer: string) => void
  timeLeft: number
  totalTime: number
  selectedAnswer: string | undefined
}

export function QuizQuestion({ question, onAnswer, timeLeft, totalTime, selectedAnswer }: QuizQuestionProps) {
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([])
  const [animateCorrect, setAnimateCorrect] = useState(false)

  // Shuffle options when question changes
  useEffect(() => {
    if (!question) return

    const options = [...question.options]
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[options[i], options[j]] = [options[j], options[i]]
    }

    setShuffledOptions(options)
    setAnimateCorrect(false)
  }, [question])

  // Handle correct answer animation
  useEffect(() => {
    if (selectedAnswer === question.correct_answer) {
      setAnimateCorrect(true)
    }
  }, [selectedAnswer, question.correct_answer])

  const getButtonVariant = (option: string) => {
    if (!selectedAnswer) return "outline"

    if (option === question.correct_answer) {
      return "success"
    }

    if (option === selectedAnswer && selectedAnswer !== question.correct_answer) {
      return "destructive"
    }

    return "outline"
  }

  const getButtonClassName = (option: string) => {
    const className = "h-auto py-4 px-6 justify-between text-left border-2 transition-all duration-300"

    if (!selectedAnswer) {
      return `${className} hover:border-primary/50 hover:shadow-md`
    }

    if (option === question.correct_answer) {
      return `${className} correct-answer ${animateCorrect ? "animate-pulse-slow" : ""}`
    }

    if (option === selectedAnswer && selectedAnswer !== question.correct_answer) {
      return `${className} wrong-answer`
    }

    return `${className} opacity-70`
  }

  const getButtonIcon = (option: string) => {
    if (!selectedAnswer) return null

    if (option === question.correct_answer) {
      return <CheckCircle2 className="h-5 w-5 ml-2" />
    }

    if (option === selectedAnswer && selectedAnswer !== question.correct_answer) {
      return <XCircle className="h-5 w-5 ml-2" />
    }

    return null
  }

  const timeProgress = (timeLeft / totalTime) * 100
  const timeProgressColor = timeProgress < 30 ? "bg-red-500" : timeProgress < 60 ? "bg-yellow-500" : "bg-green-500"

  return (
    <Card className="game-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl sm:text-2xl leading-tight">{question.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-2 mb-6 bg-muted rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full ${timeProgressColor} transition-all duration-1000 ease-linear`}
            style={{ width: `${timeProgress}%` }}
          ></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shuffledOptions.map((option) => (
            <Button
              key={option}
              variant={getButtonVariant(option)}
              className={getButtonClassName(option)}
              onClick={() => !selectedAnswer && onAnswer(option)}
              disabled={!!selectedAnswer}
            >
              <span>{option}</span>
              {getButtonIcon(option)}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

