'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthContext } from '@/components/providers/auth-provider'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

function setLocaleCookie(language: string) {
  document.cookie = `NEXT_LOCALE=${language};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
}

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  // Read from server-provided AuthProvider context (if available)
  const serverAuth = useAuthContext()

  const [state, setState] = useState<AuthState>({
    user: serverAuth.user,
    profile: serverAuth.profile,
    loading: !serverAuth.user, // Skip loading if server data is available
    error: null,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // If we already have server-provided data, skip the initial fetch
    if (serverAuth.user && serverAuth.profile) {
      if (serverAuth.profile.language) {
        setLocaleCookie(serverAuth.profile.language)
      }
      return
    }

    // Fallback: fetch client-side (for login page, etc.)
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) throw error

        if (session?.user) {
          const response = await fetch('/api/profile')
          if (response.ok) {
            const profile = await response.json()
            if (profile?.language) {
              setLocaleCookie(profile.language)
            }
            setState({
              user: session.user,
              profile,
              loading: false,
              error: null,
            })
          } else {
            setState({
              user: session.user,
              profile: null,
              loading: false,
              error: 'Failed to load profile',
            })
          }
        } else {
          setState({
            user: null,
            profile: null,
            loading: false,
            error: null,
          })
        }
      } catch (error) {
        setState({
          user: null,
          profile: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication error',
        })
      }
    }

    getSession()
  }, [supabase, serverAuth.user, serverAuth.profile])

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const response = await fetch('/api/profile')
          if (response.ok) {
            const profile = await response.json()
            if (profile?.language) {
              setLocaleCookie(profile.language)
            }
            setState({
              user: session.user,
              profile,
              loading: false,
              error: null,
            })
          }
        } else {
          setState({
            user: null,
            profile: null,
            loading: false,
            error: null,
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      const profileRes = await fetch('/api/profile')
      const profile = profileRes.ok ? await profileRes.json() : null

      if (profile?.language) {
        setLocaleCookie(profile.language)
      }

      setState({
        user: data.user,
        profile,
        loading: false,
        error: null,
      })

      router.push('/dashboard')
      router.refresh()

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      await fetch('/api/auth/sign-out', { method: 'POST' })

      setState({
        user: null,
        profile: null,
        loading: false,
        error: null,
      })

      router.push('/login')
      router.refresh()

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }

  return {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    signIn,
    signOut,
    isAuthenticated: !!state.user,
  }
}
