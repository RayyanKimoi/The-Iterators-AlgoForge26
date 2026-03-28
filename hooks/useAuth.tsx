import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react'
import { AuthError, Session, User } from '@supabase/supabase-js'

import { supabase } from '../lib/supabase'

export type Profile = {
  id: string
  full_name: string
  phone_number: string | null
  aadhaar_hash: string | null
  aadhaar_verified: boolean
  role: 'civilian' | 'police' | 'admin'
  avatar_url: string | null
  created_at: string
  updated_at: string
}

type SignUpPayload = {
  email: string
  password: string
  fullName: string
  phoneNumber: string
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signUp: (payload: SignUpPayload) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: AuthError | null }>
  resendOtp: (email: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadProfile = async (userId?: string) => {
      if (!userId) {
        if (isMounted) {
          setProfile(null)
        }
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!isMounted) {
        return
      }

      if (!error && data) {
        setProfile(data as Profile)
      }
    }

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession()
      if (isMounted) {
        setSession(data.session)
        await loadProfile(data.session?.user?.id)
        setLoading(false)
      }
    }

    void bootstrap()

    const { data } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      await loadProfile(nextSession?.user?.id)
      setLoading(false)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signUp: async ({ email, password, fullName, phoneNumber }) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone_number: phoneNumber,
            },
          },
        })

        return { error }
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error }
      },
      verifyOtp: async (email, token) => {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'signup',
        })

        return { error }
      },
      resendOtp: async (email) => {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
        })

        return { error }
      },
      signOut: async () => {
        await supabase.auth.signOut({ scope: 'local' })
      },
      refreshProfile: async () => {
        const nextUserId = session?.user?.id
        if (!nextUserId) {
          setProfile(null)
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', nextUserId)
          .maybeSingle()

        if (!error && data) {
          setProfile(data as Profile)
        }
      },
    }),
    [loading, profile, session]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return ctx
}
