'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { UserProvider } from '@/contexts/user-context'
import type { UserRole } from '@/types'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  user: {
    id: string
    name: string
    email: string
    role: UserRole
  }
}

export function DashboardLayoutClient({ children, user }: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <UserProvider
      user={{
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }}
    >
      <MobileNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Sidebar />

      <div className="lg:pl-64">
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />

        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </UserProvider>
  )
}
