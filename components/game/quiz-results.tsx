"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, ArrowUpCircle } from "lucide-react"
import confetti from "canvas-confetti"
import { calculateRank, getNextRank, calculateRankProgress } from "@/utils/rank"
import { Badge } from "@/components/ui/badge"

interface Profile {
  id: string
  username: string
  experience: number
  level: number
}

interface QuizResultsProps {
  score: number
  totalQuestions: number
  expGained: number
  onReturnToDashboard: () => void
  profile: Profile
}

export function QuizResults({ score, totalQuestions, expGained, onReturnToDashboard, profile }: QuizResultsProps) {
  const percentage = Math.round((score / (totalQuestions * 10)) * 100)
  const oldExp = profile.experience
  const newExp = oldExp + expGained

  // Calculate rank information
  const oldRankInfo = calculateRank(oldExp)
  const newRankInfo = calculateRank(newExp)
  const rankUp = oldRankInfo.name !== newRankInfo.name
  const nextRank = getNextRank(newExp)
  const oldRankProgress = calculateRankProgress(oldExp)
  const newRankProgress = calculateRankProgress(newExp)

  useEffect(() => {
    // Celebration confetti for good scores or rank ups
    if (percentage >= 70 || rankUp) {
      const duration = 3 * 1000
      const end = Date.now() + duration
      ;(function frame() {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        })

        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      })()
    }
  }, [percentage, rankUp])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/10 p-4">
      <Card className="w-full max-w-md shadow-lg game-card">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold">Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4 animate-float">
              <Trophy className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-4xl font-bold mb-2">{score} points</h2>
            <p className="text-muted-foreground">
              You answered correctly {score / 10} out of {totalQuestions} questions
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Score</span>
              <span className="font-medium">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Experience Gained</h3>
            </div>
            <p className="text-2xl font-bold mb-2">+{expGained} XP</p>

            {/* Rank information */}
            <div className="mt-4 pt-4 border-t border-muted-foreground/20">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Current Rank:</span>
                  <Badge className={`${oldRankInfo.color} bg-opacity-20`}>
                    {oldRankInfo.icon} {oldRankInfo.name}
                  </Badge>
                </div>
                {rankUp && (
                  <div className="flex items-center gap-1 animate-pulse-slow">
                    <ArrowUpCircle className="h-4 w-4 text-primary" />
                    <Badge className={`${newRankInfo.color} bg-opacity-20`}>
                      {newRankInfo.icon} {newRankInfo.name}
                    </Badge>
                  </div>
                )}
              </div>

              {nextRank && (
                <>
                  <div className="flex justify-between text-xs mt-2">
                    <span>Previous Rank Progress:</span>
                    <span>{oldRankProgress}%</span>
                  </div>
                  <Progress value={oldRankProgress} className="h-1.5 bg-primary/20 mt-1" />

                  <div className="flex justify-between text-xs mt-2">
                    <span>Current Rank Progress:</span>
                    <span>{newRankProgress}%</span>
                  </div>
                  <Progress value={newRankProgress} className="h-1.5 mt-1" />

                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>Next Rank:</span>
                    <Badge className={`${nextRank.color} bg-opacity-20 text-xs`}>
                      {nextRank.icon} {nextRank.name}
                    </Badge>
                    <span>at {nextRank.minXP} XP</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={onReturnToDashboard}
            className="w-full game-shadow bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700"
          >
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

