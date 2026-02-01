import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayoutClient } from './layout-client'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  return (
    <DashboardLayoutClient user={userData}>
      {children}
    </DashboardLayoutClient>
  )
}
