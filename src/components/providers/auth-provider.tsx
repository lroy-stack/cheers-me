'use client'

import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
})

export function AuthProvider({
  user,
  profile,
  children,
}: {
  user: User | null
  profile: Profile | null
  children: React.ReactNode
}) {
  return (
    <AuthContext.Provider value={{ user, profile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  return useContext(AuthContext)
}
