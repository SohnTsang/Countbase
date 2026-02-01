'use client'

import { useState } from 'react'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { AdminHeader } from '@/components/layout/admin-header'
import { AdminMobileNav } from '@/components/layout/admin-mobile-nav'
import type { UserRole } from '@/types'

interface AdminLayoutClientProps {
  children: React.ReactNode
  user: {
    id: string
    name: string
    email: string
    role: UserRole
    is_platform_admin: boolean
  }
}

export function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <AdminMobileNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AdminSidebar />

      <div className="lg:pl-64">
        <AdminHeader user={user} onMenuClick={() => setSidebarOpen(true)} />

        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
