'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendInvitationEmail } from '@/lib/email/send'
import { emailConfig } from '@/lib/email/config'
import { createAuditLog } from '@/lib/audit'
import type { UserRole, UserInvitation, TenantUserStats } from '@/types'
import { z } from 'zod'

// Validation schemas
const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'manager', 'staff', 'readonly']),
})

const acceptInvitationSchema = z.object({
  token: z.string().uuid('Invalid invitation token'),
  name: z.string().min(1, 'Name is required').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// Roles that managers can assign
const MANAGER_ASSIGNABLE_ROLES: UserRole[] = ['staff', 'readonly']

// Get current user's locale from cookies
async function getLocale(): Promise<'en' | 'ja' | 'zh' | 'es'> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'en'
  return locale as 'en' | 'ja' | 'zh' | 'es'
}

/**
 * Get tenant user statistics (current users, pending invitations, max users)
 */
export async function getTenantUserStats(tenantId?: string): Promise<TenantUserStats | null> {
  const supabase = await createClient()

  // Get current user's tenant if not provided
  if (!tenantId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userData) return null
    tenantId = userData.tenant_id
  }

  const { data, error } = await supabase.rpc('get_tenant_user_stats', {
    p_tenant_id: tenantId,
  })

  if (error || !data || data.length === 0) {
    console.warn('Could not get tenant user stats:', JSON.stringify(error), 'data:', JSON.stringify(data))
    return null
  }

  return data[0] as TenantUserStats
}

/**
 * Get pending invitations for the current tenant
 */
export async function getPendingInvitations(): Promise<UserInvitation[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'manager'].includes(userData.role)) {
    return []
  }

  const { data, error } = await supabase
    .from('user_invitations')
    .select('*')
    .eq('tenant_id', userData.tenant_id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('Could not get pending invitations:', JSON.stringify(error))
    return []
  }

  return data as UserInvitation[]
}

/**
 * Invite a new user to the tenant
 */
export async function inviteUser(formData: { email: string; role: UserRole }) {
  const supabase = await createClient()

  // Validate input
  const validated = inviteUserSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Not authenticated'] } }

  const { data: currentUser } = await supabase
    .from('users')
    .select('tenant_id, role, name, tenant:tenants(name, max_users)')
    .eq('id', user.id)
    .single()

  if (!currentUser) return { error: { _form: ['User not found'] } }

  // Check permission
  if (!['admin', 'manager'].includes(currentUser.role)) {
    return { error: { _form: ['You do not have permission to invite users'] } }
  }

  // Managers can only assign staff/readonly roles
  if (currentUser.role === 'manager' && !MANAGER_ASSIGNABLE_ROLES.includes(validated.data.role)) {
    return { error: { role: ['You can only invite Staff or Read Only users'] } }
  }

  // Check if email is already a user in this tenant
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('tenant_id', currentUser.tenant_id)
    .eq('email', validated.data.email)
    .single()

  if (existingUser) {
    return { error: { email: ['This email is already registered in your organization'] } }
  }

  // Check user limit
  const stats = await getTenantUserStats(currentUser.tenant_id)
  if (!stats) {
    return { error: { _form: ['Failed to check user limit'] } }
  }

  if (stats.current_users + stats.pending_invitations >= stats.max_users) {
    return { error: { _form: [`User limit reached (${stats.max_users}). Contact your administrator to increase the limit.`] } }
  }

  // Check for existing pending invitation
  const { data: existingInvitation } = await supabase
    .from('user_invitations')
    .select('id')
    .eq('tenant_id', currentUser.tenant_id)
    .eq('email', validated.data.email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvitation) {
    return { error: { email: ['An invitation is already pending for this email'] } }
  }

  // Delete any expired invitations for this email
  await supabase
    .from('user_invitations')
    .delete()
    .eq('tenant_id', currentUser.tenant_id)
    .eq('email', validated.data.email)
    .is('accepted_at', null)

  // Create invitation
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + emailConfig.invitationExpiryHours)

  const { data: invitation, error: insertError } = await supabase
    .from('user_invitations')
    .insert({
      tenant_id: currentUser.tenant_id,
      email: validated.data.email,
      role: validated.data.role,
      invited_by: user.id,
      invited_by_name: currentUser.name,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error creating invitation:', insertError)
    return { error: { _form: ['Failed to create invitation'] } }
  }

  // Send invitation email
  const locale = await getLocale()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantData = currentUser.tenant as any
  const tenant = Array.isArray(tenantData) ? tenantData[0] : tenantData

  const emailResult = await sendInvitationEmail({
    to: validated.data.email,
    invitedByName: currentUser.name,
    tenantName: tenant?.name || 'Organization',
    role: validated.data.role,
    token: invitation.token,
    expiresAt,
    locale,
  })

  if (!emailResult.success) {
    // Delete the invitation if email fails
    await supabase.from('user_invitations').delete().eq('id', invitation.id)
    return { error: { _form: ['Failed to send invitation email. Please try again.'] } }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    resourceType: 'user',
    resourceId: invitation.id,
    resourceName: validated.data.email,
    newValues: {
      email: validated.data.email,
      role: validated.data.role,
      status: 'invited',
    },
    notes: 'User invitation sent',
  })

  revalidatePath('/users')
  return { success: true }
}

/**
 * Resend an invitation email
 */
export async function resendInvitation(invitationId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: currentUser } = await supabase
    .from('users')
    .select('tenant_id, role, name, tenant:tenants(name)')
    .eq('id', user.id)
    .single()

  if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
    return { error: 'You do not have permission to resend invitations' }
  }

  // Get invitation
  const { data: invitation } = await supabase
    .from('user_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('tenant_id', currentUser.tenant_id)
    .is('accepted_at', null)
    .single()

  if (!invitation) {
    return { error: 'Invitation not found or already accepted' }
  }

  // Generate new token and extend expiry
  const newExpiresAt = new Date()
  newExpiresAt.setHours(newExpiresAt.getHours() + emailConfig.invitationExpiryHours)

  const { data: updatedInvitation, error: updateError } = await supabase
    .from('user_invitations')
    .update({
      token: crypto.randomUUID(),
      expires_at: newExpiresAt.toISOString(),
      invited_by: user.id,
      invited_by_name: currentUser.name,
    })
    .eq('id', invitationId)
    .select()
    .single()

  if (updateError || !updatedInvitation) {
    return { error: 'Failed to update invitation' }
  }

  // Send new email
  const locale = await getLocale()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantData2 = currentUser.tenant as any
  const tenant2 = Array.isArray(tenantData2) ? tenantData2[0] : tenantData2

  const emailResult = await sendInvitationEmail({
    to: updatedInvitation.email,
    invitedByName: currentUser.name,
    tenantName: tenant2?.name || 'Organization',
    role: updatedInvitation.role,
    token: updatedInvitation.token,
    expiresAt: newExpiresAt,
    locale,
  })

  if (!emailResult.success) {
    return { error: 'Failed to send invitation email' }
  }

  revalidatePath('/users')
  return { success: true }
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(invitationId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: currentUser } = await supabase
    .from('users')
    .select('tenant_id, role, name')
    .eq('id', user.id)
    .single()

  if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
    return { error: 'You do not have permission to cancel invitations' }
  }

  // Get invitation to verify it belongs to this tenant
  const { data: invitation } = await supabase
    .from('user_invitations')
    .select('email')
    .eq('id', invitationId)
    .eq('tenant_id', currentUser.tenant_id)
    .is('accepted_at', null)
    .single()

  if (!invitation) {
    return { error: 'Invitation not found or already accepted' }
  }

  // Delete invitation
  const { error: deleteError } = await supabase
    .from('user_invitations')
    .delete()
    .eq('id', invitationId)

  if (deleteError) {
    return { error: 'Failed to cancel invitation' }
  }

  // Audit log
  await createAuditLog({
    action: 'delete',
    resourceType: 'user',
    resourceId: invitationId,
    resourceName: invitation.email,
    notes: 'User invitation cancelled',
  })

  revalidatePath('/users')
  return { success: true }
}

/**
 * Get invitation details by token (for accept page)
 */
export async function getInvitationByToken(token: string): Promise<{
  invitation: UserInvitation | null
  locale?: string
  error?: string
}> {
  // Use service client to bypass RLS so we can join tenants table for anonymous users
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('user_invitations')
    .select('*, tenant:tenants(name, settings)')
    .eq('token', token)
    .single()

  if (error || !data) {
    return { invitation: null, error: 'Invitation not found' }
  }

  // Check if already accepted
  if (data.accepted_at) {
    return { invitation: null, error: 'This invitation has already been used' }
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    return { invitation: null, error: 'This invitation has expired' }
  }

  // Extract tenant locale
  const tenantData = data.tenant as { name: string; settings?: Record<string, unknown> } | null
  const tenantLocale = (tenantData?.settings?.default_locale as string) || 'en'

  return { invitation: data as UserInvitation, locale: tenantLocale }
}

/**
 * Accept an invitation and create user account
 */
export async function acceptInvitation(formData: {
  token: string
  name: string
  password: string
}) {
  // Use service client to create auth users and write to tables
  const supabase = createServiceClient()

  // Validate input
  const validated = acceptInvitationSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  // Get invitation
  const { invitation, error: invitationError } = await getInvitationByToken(validated.data.token)
  if (!invitation || invitationError) {
    return { error: { _form: [invitationError || 'Invalid invitation'] } }
  }

  // Check if email is already registered (user tried to accept again)
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', invitation.email)
    .single()

  if (existingUser) {
    // Mark invitation as accepted if user exists
    await supabase
      .from('user_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return { error: { _form: ['This email is already registered. Please log in instead.'] } }
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: invitation.email,
    password: validated.data.password,
    email_confirm: true,
  })

  if (authError) {
    console.error('Error creating auth user:', authError)
    if (authError.message.includes('already registered')) {
      return { error: { _form: ['This email is already registered. Please log in instead.'] } }
    }
    return { error: { _form: ['Failed to create account. Please try again.'] } }
  }

  // Create user record
  const { error: insertError } = await supabase.from('users').insert({
    id: authData.user.id,
    tenant_id: invitation.tenant_id,
    email: invitation.email,
    name: validated.data.name,
    role: invitation.role,
    active: true,
  })

  if (insertError) {
    // Clean up auth user if user record creation fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    console.error('Error creating user record:', insertError)
    return { error: { _form: ['Failed to create account. Please try again.'] } }
  }

  // Mark invitation as accepted
  await supabase
    .from('user_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  // Audit log (using service role, so we can't use createAuditLog which requires auth)
  await supabase.from('audit_logs').insert({
    tenant_id: invitation.tenant_id,
    user_id: authData.user.id,
    user_name: validated.data.name,
    user_email: invitation.email,
    action: 'create',
    resource_type: 'user',
    resource_id: authData.user.id,
    resource_name: validated.data.name,
    new_values: {
      email: invitation.email,
      name: validated.data.name,
      role: invitation.role,
    },
    notes: 'User accepted invitation',
  })

  return { success: true }
}
