'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { UserRole } from '@/types'

interface UserContextValue {
  userId: string
  email: string
  name: string
  role: UserRole
  isPlatformAdmin: boolean
}

const UserContext = createContext<UserContextValue | null>(null)

interface UserProviderProps {
  children: ReactNode
  user: UserContextValue
}

export function UserProvider({ children, user }: UserProviderProps) {
  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export function useUserRole() {
  const user = useUser()
  return user.role
}

export function useIsPlatformAdmin() {
  const user = useUser()
  return user.isPlatformAdmin
}
