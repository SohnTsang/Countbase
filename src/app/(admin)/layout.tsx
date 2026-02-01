import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayoutClient } from './layout-client'

export default async function AdminLayout({
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
    .select('id, name, email, role, is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // Check if user is platform admin
  if (!userData.is_platform_admin) {
    redirect('/')
  }

  return (
    <AdminLayoutClient user={userData}>
      {children}
    </AdminLayoutClient>
  )
}
