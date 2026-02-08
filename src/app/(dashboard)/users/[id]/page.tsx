import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserForm } from '@/components/forms/user-form'
import { getAssignableRoles } from '@/lib/actions/users'
import type { UserRole } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

// Roles that managers can manage
const MANAGER_MANAGEABLE_ROLES: UserRole[] = ['staff', 'readonly']

export default async function EditUserPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user and check if admin or manager
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single()

  // Only admins and managers can access this page
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
    redirect('/')
  }

  // Get user to edit
  const { data: userToEdit, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !userToEdit) {
    notFound()
  }

  const isCurrentUser = currentUser.id === userToEdit.id

  // Determine if the current user can edit this user
  // Admins can edit anyone, managers can only edit staff/readonly
  const canEditUser =
    currentUser.role === 'admin' ||
    (currentUser.role === 'manager' && MANAGER_MANAGEABLE_ROLES.includes(userToEdit.role as UserRole))

  // Get roles this user can assign
  const assignableRoles = await getAssignableRoles()

  return (
    <UserForm
      user={userToEdit}
      isCurrentUser={isCurrentUser}
      assignableRoles={assignableRoles}
      canEditUser={canEditUser}
    />
  )
}
