'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createUserSchemaDefault, userSchema, type CreateUserFormData, type UserFormData } from '@/lib/validations/user'
import { createAuditLog } from '@/lib/audit'
import { computeChanges } from '@/lib/audit-utils'
import type { UserRole } from '@/types'

// Roles that managers can manage (not admin or manager)
const MANAGER_MANAGEABLE_ROLES: UserRole[] = ['staff', 'readonly']

// Helper to check if current user can manage the target role
function canManageRole(currentRole: UserRole, targetRole: UserRole): boolean {
  if (currentRole === 'admin') return true
  if (currentRole === 'manager') return MANAGER_MANAGEABLE_ROLES.includes(targetRole)
  return false
}

export async function getUsers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getUser(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function createUser(formData: CreateUserFormData) {
  const supabase = await createClient()

  // Validate
  const validated = createUserSchemaDefault.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  // Get current user's tenant_id and role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Not authenticated'] } }

  const { data: currentUser } = await supabase
    .from('users')
    .select('tenant_id, role, name')
    .eq('id', user.id)
    .single()

  if (!currentUser) return { error: { _form: ['User not found'] } }

  // Check if user has permission to manage users
  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    return { error: { _form: ['You do not have permission to create users'] } }
  }

  // Managers can only create staff/readonly users
  if (!canManageRole(currentUser.role, validated.data.role)) {
    return { error: { role: ['You can only create Staff or Read Only users'] } }
  }

  // Create auth user via admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: validated.data.email,
    password: validated.data.password,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { error: { email: ['Email is already registered'] } }
    }
    return { error: { _form: [authError.message] } }
  }

  // Create user record in our users table
  const { error: insertError } = await supabase.from('users').insert({
    id: authData.user.id,
    tenant_id: currentUser.tenant_id,
    email: validated.data.email,
    name: validated.data.name,
    role: validated.data.role,
    active: validated.data.active,
  })

  if (insertError) {
    // Clean up auth user if user record creation fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: { _form: [insertError.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    resourceType: 'user',
    resourceId: authData.user.id,
    resourceName: validated.data.name,
    newValues: {
      email: validated.data.email,
      name: validated.data.name,
      role: validated.data.role,
      active: validated.data.active,
    },
  })

  revalidatePath('/users')
  return { success: true }
}

export async function updateUser(id: string, formData: UserFormData) {
  const supabase = await createClient()

  // Validate
  const validated = userSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Not authenticated'] } }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (!currentUser) return { error: { _form: ['User not found'] } }

  // Check if user has permission to manage users
  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    return { error: { _form: ['You do not have permission to update users'] } }
  }

  // Get the target user's current data
  const { data: targetUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (!targetUser) return { error: { _form: ['Target user not found'] } }

  // Managers can only edit staff/readonly users
  if (!canManageRole(currentUser.role, targetUser.role)) {
    return { error: { _form: ['You can only edit Staff or Read Only users'] } }
  }

  // Managers can only set role to staff/readonly
  if (!canManageRole(currentUser.role, validated.data.role)) {
    return { error: { role: ['You can only assign Staff or Read Only roles'] } }
  }

  // Prevent demoting self (for admins)
  if (id === user.id && currentUser.role === 'admin' && validated.data.role !== 'admin') {
    return { error: { role: ['You cannot change your own admin role'] } }
  }

  const newValues = {
    name: validated.data.name,
    role: validated.data.role,
    active: validated.data.active,
  }

  // Update user record
  const { error } = await supabase
    .from('users')
    .update(newValues)
    .eq('id', id)

  if (error) {
    return { error: { _form: [error.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'update',
    resourceType: 'user',
    resourceId: id,
    resourceName: validated.data.name,
    oldValues: { name: targetUser.name, role: targetUser.role, active: targetUser.active },
    newValues,
    changes: computeChanges(
      { name: targetUser.name, role: targetUser.role, active: targetUser.active },
      newValues
    ),
  })

  revalidatePath('/users')
  return { success: true }
}

export async function toggleUserActive(id: string, active: boolean) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (!currentUser) return { error: 'User not found' }

  // Check if user has permission to manage users
  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    return { error: 'You do not have permission to update users' }
  }

  // Get the target user's role
  const { data: targetUser } = await supabase
    .from('users')
    .select('role, name, active')
    .eq('id', id)
    .single()

  if (!targetUser) return { error: 'Target user not found' }

  // Managers can only toggle staff/readonly users
  if (!canManageRole(currentUser.role, targetUser.role)) {
    return { error: 'You can only manage Staff or Read Only users' }
  }

  // Prevent deactivating self
  if (id === user.id && !active) {
    return { error: 'You cannot deactivate yourself' }
  }

  const { error } = await supabase
    .from('users')
    .update({ active })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Audit log
  await createAuditLog({
    action: 'update',
    resourceType: 'user',
    resourceId: id,
    resourceName: targetUser.name,
    oldValues: { active: targetUser.active },
    newValues: { active },
    notes: active ? 'User activated' : 'User deactivated',
  })

  revalidatePath('/users')
  return { success: true }
}

export async function deleteUser(id: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (!currentUser) return { error: 'User not found' }

  // Check if user has permission to manage users
  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    return { error: 'You do not have permission to delete users' }
  }

  // Get the target user's role
  const { data: targetUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (!targetUser) return { error: 'Target user not found' }

  // Managers can only delete staff/readonly users
  if (!canManageRole(currentUser.role, targetUser.role)) {
    return { error: 'You can only delete Staff or Read Only users' }
  }

  // Prevent deleting self
  if (id === user.id) {
    return { error: 'You cannot delete yourself' }
  }

  // Audit log BEFORE deletion
  await createAuditLog({
    action: 'delete',
    resourceType: 'user',
    resourceId: id,
    resourceName: targetUser.name,
    oldValues: {
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      active: targetUser.active,
    },
  })

  // Delete from users table (RLS will handle tenant check)
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return { error: deleteError.message }
  }

  // Delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(id)
  if (authError) {
    console.error('Failed to delete auth user:', authError)
  }

  revalidatePath('/users')
  return { success: true }
}

// Get roles that the current user can assign
export async function getAssignableRoles(): Promise<UserRole[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!currentUser) return []

  if (currentUser.role === 'admin') {
    return ['admin', 'manager', 'staff', 'readonly']
  }

  if (currentUser.role === 'manager') {
    return ['staff', 'readonly']
  }

  return []
}
