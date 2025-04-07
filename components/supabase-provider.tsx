"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { Spinner } from "@/components/ui/spinner";

type SupabaseContextType = {
  supabase: SupabaseClient;
  user: User | null;
  loading: boolean;
  ensureProfile: (user: User) => Promise<void>;
};

// Create Supabase Context
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  // Initialize Supabase client
  const supabase = createClientComponentClient();

  /**
   * Ensures that a user profile exists in the database.
   * If the profile doesn't exist, it attempts to create one.
   * Uses upsert to handle potential race conditions.
   */
  const ensureProfile = async (user: User) => {
    try {
      console.log(`Checking profile for user ID: ${user.id}`);

      // Check if the profile exists

      const
        {data : existingProfile,error: profileError } = await supabase 
        .from("profiles")
        .select()
        .eq("id", user.id)
        .single();


      console.log("existingProfile", existingProfile,profileError )

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error checking profile existence:", profileError.message);
        return;
      }

      if (existingProfile) {
        console.log(`Profile already exists for user ID: ${user.id}`);
        return;
      }

      console.log(`Creating profile for user ID: ${user.id}`);

      // Delay to ensure the auth user is fully created

      // Generate a default username if none exists
      const username = user.user_metadata?.username || `user_${user.id.substring(0, 8)}`;

      // Insert new profile, handling race conditions
      const { error: insertError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          username,
          experience: 0,
          level: 1,
        },
        { onConflict: "id" }
      );

      if (insertError) {
        console.error("Error creating profile:", insertError.message);
      } else {
        console.log(`Profile created successfully for user ID: ${user.id}`);
      }
    } catch (error) {
      console.error("Unexpected error in ensureProfile:", error);
    }
  };

  /**
   * Fetches the user's authentication session and updates the state accordingly.
   */
  useEffect(() => {
    const getSession = async () => {
      try {
        console.log("Fetching session...");
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error fetching session:", error.message);
          return;
        }

        const session = data.session;
        console.log("Session data:", session);

        if (session?.user) {
          console.log(`User found: ${session.user.email}`);
          setUser(session.user);
          console.log("ensureProfile 1")
          await ensureProfile(session.user);
        } else {
          console.log("No active session.");
          setUser(null);
        }

        setLoading(false);
        setIsInitialized(true);
      } catch (error) {
        console.error("Unexpected error getting session:", error);
      }
    };

    getSession();

    // Subscribe to authentication state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("Auth state changed:", _event);

        if (session?.user) {
          console.log(`User signed in: ${session.user.email}`);
          setUser(session.user);
          console.log("ensureProfile 2")
          await ensureProfile(session.user);
        } else {
          console.log("User signed out.");
          setUser(null);
        }

        router.refresh();
      }
    );

    // Cleanup function to unsubscribe from auth changes
    //return () => {
      //console.log("Unsubscribing from auth state changes.");
      //authListener.subscription.unsubscribe()
    //};
  }, [router]);

  // Show a loading spinner while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <SupabaseContext.Provider value={{ supabase, user, loading, ensureProfile }}>
      {children}
    </SupabaseContext.Provider>
  );
}

/**
 * Custom hook to use the Supabase context.
 * Ensures that the context is used within a `SupabaseProvider`.
 */
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider");
  }
  return context;
};
