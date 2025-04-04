import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SupabaseProvider } from "@/components/supabase-provider"
import { FriendsSidebarWrapper } from "@/components/friends/friends-sidebar-wrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Quize - Interactive Quiz Game",
  description: "A multiplayer quiz game with realtime features",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SupabaseProvider>
            <FriendsSidebarWrapper>{children}</FriendsSidebarWrapper>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'