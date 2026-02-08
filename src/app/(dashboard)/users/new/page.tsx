import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserForm } from '@/components/forms/user-form'
import { getAssignableRoles } from '@/lib/actions/users'

export default async function NewUserPage() {
  const supabase = await createClient()

  // Get current user and check if admin or manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only admins and managers can create users
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
    redirect('/')
  }

  // Get roles this user can assign
  const assignableRoles = await getAssignableRoles()

  return <UserForm assignableRoles={assignableRoles} />
}
