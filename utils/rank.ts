export type Rank = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Heroic" | "Master"

export interface RankInfo {
  name: Rank
  color: string
  minXP: number
  icon: string
}

export const ranks: RankInfo[] = [
  { name: "Bronze", color: "text-amber-700", minXP: 0, icon: "🥉" },
  { name: "Silver", color: "text-gray-400", minXP: 300, icon: "🥈" },
  { name: "Gold", color: "text-yellow-500", minXP: 800, icon: "🥇" },
  { name: "Platinum", color: "text-cyan-400", minXP: 1500, icon: "💎" },
  { name: "Diamond", color: "text-blue-500", minXP: 3000, icon: "💠" },
  { name: "Heroic", color: "text-purple-500", minXP: 5000, icon: "👑" },
  { name: "Master", color: "text-red-500", minXP: 10000, icon: "🏆" },
]

export function calculateRank(xp: number): RankInfo {
  // Find the highest rank the user qualifies for
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (xp >= ranks[i].minXP) {
      return ranks[i]
    }
  }

  // Default to Bronze if something goes wrong
  return ranks[0]
}

export function getNextRank(xp: number): RankInfo | null {
  const currentRank = calculateRank(xp)
  const currentRankIndex = ranks.findIndex((rank) => rank.name === currentRank.name)

  // If user is already at the highest rank
  if (currentRankIndex === ranks.length - 1) {
    return null
  }

  return ranks[currentRankIndex + 1]
}

export function calculateRankProgress(xp: number): number {
  const currentRank = calculateRank(xp)
  const nextRank = getNextRank(xp)

  // If user is at the highest rank
  if (!nextRank) {
    return 100
  }

  const xpInCurrentRank = xp - currentRank.minXP
  const xpNeededForNextRank = nextRank.minXP - currentRank.minXP

  return Math.min(100, Math.floor((xpInCurrentRank / xpNeededForNextRank) * 100))
}

