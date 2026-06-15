import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Profile = {
  id: string
  full_name: string | null
  phone_number: string | null
  role: string
  aadhaar_verified: boolean
  created_at: string
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('AuthProvider: Error fetching profile:', error)
        return null
      }
      return data as Profile
    } catch (err) {
      console.error('AuthProvider: Unexpected error fetching profile:', err)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  }

  useEffect(() => {
    let mounted = true
    let authListener: any = null

    const init = async () => {
      console.log('AuthProvider: Initializing...')
      
      // Get initial session
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        if (error) throw error
        
        if (mounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          if (initialSession?.user) {
            const profileData = await fetchProfile(initialSession.user.id)
            if (mounted) setProfile(profileData)
          }
        }
      } catch (error) {
        console.error('AuthProvider: Error getting initial session', error)
      } finally {
        if (mounted) setLoading(false)
      }

      // Listen for auth changes after initial session is loaded
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          console.log(`AuthProvider: Auth event: ${event}`)
          if (mounted) {
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            if (currentSession?.user) {
              const profileData = await fetchProfile(currentSession.user.id)
              if (mounted) setProfile(profileData)
            } else {
              setProfile(null)
            }
          }
        }
      )
      authListener = subscription
    }

    init()

    return () => {
      mounted = false
      if (authListener) {
        authListener.unsubscribe()
      }
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    return { error: error as Error | null }
  }

  const signOut = async () => {
    try {
      console.log('AuthContext: Signing out...')
      await supabase.auth.signOut({ scope: 'global' })
    } catch (error) {
      console.error('AuthContext: Error during signOut:', error)
    } finally {
      setUser(null)
      setProfile(null)
      setSession(null)
      
      // Clear all possible related storage keys
      const keysToClear = [
        'supabase.auth.token',
        'sb-' + import.meta.env.VITE_SUPABASE_URL + '-auth-token'
      ]
      
      // Also look for any key starting with sb- and ending with -auth-token
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          keysToClear.push(key)
        }
      }

      keysToClear.forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })

      console.log('AuthContext: Sign out complete, state cleared.')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
