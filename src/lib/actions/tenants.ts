'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendInvitationEmail } from '@/lib/email/send'
import { emailConfig } from '@/lib/email/config'
import type { Tenant, User, UserInvitation } from '@/types'
import { z } from 'zod'

// Validation schemas
const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  max_users: z.number().int().min(1).max(1000).default(10),
  admin_email: z.string().email('Invalid email address'),
})

const updateTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  max_users: z.number().int().min(1).max(1000),
})

// Get current user's locale from cookies
async function getLocale(): Promise<'en' | 'ja' | 'zh' | 'es'> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'en'
  return locale as 'en' | 'ja' | 'zh' | 'es'
}

/**
 * Check if current user is platform admin
 */
async function requirePlatformAdmin() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', user: null, adminClient: null }

  const { data: userData } = await supabase
    .from('users')
    .select('id, name, is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_platform_admin) {
    return { error: 'Access denied. Platform admin required.', user: null, adminClient: null }
  }

  const adminClient = createServiceClient()
  return { error: null, user: userData, adminClient }
}

/**
 * Get all tenants (platform admin only)
 */
export async function getAllTenants(): Promise<{
  data: (Tenant & { user_count: number; pending_invitations: number })[]
  error?: string
}> {
  const { error, adminClient } = await requirePlatformAdmin()
  if (error || !adminClient) return { data: [], error: error || 'Unauthorized' }

  // Get all tenants
  const { data: tenants, error: tenantError } = await adminClient
    .from('tenants')
    .select('*')
    .order('name')

  if (tenantError) {
    console.error('Error fetching tenants:', tenantError)
    return { data: [], error: 'Failed to fetch tenants' }
  }

  // Get user counts for each tenant
  const tenantsWithCounts = await Promise.all(
    (tenants || []).map(async (tenant) => {
      const [usersRes, invitationsRes] = await Promise.all([
        adminClient
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('active', true),
        adminClient
          .from('user_invitations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString()),
      ])

      return {
        ...tenant,
        user_count: usersRes.count || 0,
        pending_invitations: invitationsRes.count || 0,
      }
    })
  )

  return { data: tenantsWithCounts }
}

/**
 * Get a single tenant with users and invitations
 */
export async function getTenantDetails(tenantId: string): Promise<{
  tenant: Tenant | null
  users: User[]
  invitations: UserInvitation[]
  error?: string
}> {
  const { error, adminClient } = await requirePlatformAdmin()
  if (error || !adminClient) {
    return { tenant: null, users: [], invitations: [], error: error || 'Unauthorized' }
  }

  const [tenantRes, usersRes, invitationsRes] = await Promise.all([
    adminClient.from('tenants').select('*').eq('id', tenantId).single(),
    adminClient.from('users').select('*').eq('tenant_id', tenantId).order('name'),
    adminClient
      .from('user_invitations')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ])

  if (tenantRes.error) {
    return { tenant: null, users: [], invitations: [], error: 'Tenant not found' }
  }

  return {
    tenant: tenantRes.data,
    users: usersRes.data || [],
    invitations: invitationsRes.data || [],
  }
}

/**
 * Create a new tenant with first admin (platform admin only)
 */
export async function createTenant(formData: {
  name: string
  max_users: number
  admin_email: string
}) {
  const { error, user, adminClient } = await requirePlatformAdmin()
  if (error || !adminClient || !user) {
    return { error: { _form: [error || 'Unauthorized'] } }
  }

  // Validate
  const validated = createTenantSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  // Check if email is already registered
  const { data: existingUser } = await adminClient
    .from('users')
    .select('id')
    .eq('email', validated.data.admin_email)
    .single()

  if (existingUser) {
    return { error: { admin_email: ['This email is already registered'] } }
  }

  // Create tenant
  const { data: tenant, error: tenantError } = await adminClient
    .from('tenants')
    .insert({
      name: validated.data.name,
      max_users: validated.data.max_users,
      settings: {
        reservation_expiry_hours: 24,
        require_adjustment_approval: false,
        default_currency: 'USD',
      },
    })
    .select()
    .single()

  if (tenantError) {
    console.error('Error creating tenant:', tenantError)
    return { error: { _form: ['Failed to create organization'] } }
  }

  // Create invitation for first admin
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + emailConfig.invitationExpiryHours)

  const { data: invitation, error: invitationError } = await adminClient
    .from('user_invitations')
    .insert({
      tenant_id: tenant.id,
      email: validated.data.admin_email,
      role: 'admin',
      invited_by: user.id,
      invited_by_name: user.name,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (invitationError) {
    // Clean up tenant
    await adminClient.from('tenants').delete().eq('id', tenant.id)
    console.error('Error creating invitation:', invitationError)
    return { error: { _form: ['Failed to create admin invitation'] } }
  }

  // Send invitation email
  const locale = await getLocale()

  const emailResult = await sendInvitationEmail({
    to: validated.data.admin_email,
    invitedByName: user.name,
    tenantName: validated.data.name,
    role: 'admin',
    token: invitation.token,
    expiresAt,
    locale,
  })

  if (!emailResult.success) {
    // Don't delete tenant, just warn
    console.error('Failed to send invitation email:', emailResult.error)
  }

  revalidatePath('/admin/tenants')
  return { success: true, tenantId: tenant.id }
}

/**
 * Update a tenant (platform admin only)
 */
export async function updateTenant(tenantId: string, formData: {
  name: string
  max_users: number
}) {
  const { error, adminClient } = await requirePlatformAdmin()
  if (error || !adminClient) {
    return { error: { _form: [error || 'Unauthorized'] } }
  }

  // Validate
  const validated = updateTenantSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  // Get current user count to validate max_users
  const { count: userCount } = await adminClient
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('active', true)

  if (userCount && validated.data.max_users < userCount) {
    return { error: { max_users: [`Cannot set below current user count (${userCount})`] } }
  }

  // Update tenant
  const { error: updateError } = await adminClient
    .from('tenants')
    .update({
      name: validated.data.name,
      max_users: validated.data.max_users,
    })
    .eq('id', tenantId)

  if (updateError) {
    console.error('Error updating tenant:', updateError)
    return { error: { _form: ['Failed to update organization'] } }
  }

  revalidatePath('/admin/tenants')
  revalidatePath(`/admin/tenants/${tenantId}`)
  return { success: true }
}

/**
 * Invite a user to a tenant (platform admin only)
 */
export async function inviteUserToTenant(tenantId: string, formData: {
  email: string
  role: string
}) {
  const { error, user, adminClient } = await requirePlatformAdmin()
  if (error || !adminClient || !user) {
    return { error: { _form: [error || 'Unauthorized'] } }
  }

  // Get tenant
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('name, max_users')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    return { error: { _form: ['Organization not found'] } }
  }

  // Check user limit
  const [usersRes, invitationsRes] = await Promise.all([
    adminClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('active', true),
    adminClient
      .from('user_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString()),
  ])

  const currentCount = (usersRes.count || 0) + (invitationsRes.count || 0)
  if (currentCount >= tenant.max_users) {
    return { error: { _form: [`User limit reached (${tenant.max_users})`] } }
  }

  // Check if email is already a user or has pending invitation
  const { data: existingUser } = await adminClient
    .from('users')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', formData.email)
    .single()

  if (existingUser) {
    return { error: { email: ['This email is already a member'] } }
  }

  // Delete expired invitations
  await adminClient
    .from('user_invitations')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('email', formData.email)
    .is('accepted_at', null)
    .lt('expires_at', new Date().toISOString())

  // Check for existing pending invitation
  const { data: existingInvitation } = await adminClient
    .from('user_invitations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', formData.email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvitation) {
    return { error: { email: ['An invitation is already pending for this email'] } }
  }

  // Create invitation
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + emailConfig.invitationExpiryHours)

  const { data: invitation, error: insertError } = await adminClient
    .from('user_invitations')
    .insert({
      tenant_id: tenantId,
      email: formData.email,
      role: formData.role,
      invited_by: user.id,
      invited_by_name: user.name,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error creating invitation:', insertError)
    return { error: { _form: ['Failed to create invitation'] } }
  }

  // Send email
  const locale = await getLocale()

  const emailResult = await sendInvitationEmail({
    to: formData.email,
    invitedByName: user.name,
    tenantName: tenant.name,
    role: formData.role,
    token: invitation.token,
    expiresAt,
    locale,
  })

  if (!emailResult.success) {
    await adminClient.from('user_invitations').delete().eq('id', invitation.id)
    return { error: { _form: ['Failed to send invitation email'] } }
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  return { success: true }
}

/**
 * Delete a tenant and all associated data (platform admin only)
 */
export async function deleteTenant(tenantId: string) {
  const { error, adminClient } = await requirePlatformAdmin()
  if (error || !adminClient) {
    return { error: error || 'Unauthorized' }
  }

  // Verify tenant exists
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    return { error: 'Organization not found' }
  }

  // Delete all related data
  // 1. Delete invitations
  await adminClient
    .from('user_invitations')
    .delete()
    .eq('tenant_id', tenantId)

  // 2. Get users to delete their auth accounts
  const { data: users } = await adminClient
    .from('users')
    .select('id')
    .eq('tenant_id', tenantId)

  // 3. Delete user records
  await adminClient
    .from('users')
    .delete()
    .eq('tenant_id', tenantId)

  // 4. Delete auth users
  if (users && users.length > 0) {
    for (const user of users) {
      await adminClient.auth.admin.deleteUser(user.id)
    }
  }

  // 5. Delete the tenant
  const { error: deleteError } = await adminClient
    .from('tenants')
    .delete()
    .eq('id', tenantId)

  if (deleteError) {
    console.error('Error deleting tenant:', deleteError)
    return { error: 'Failed to delete organization' }
  }

  revalidatePath('/admin/tenants')
  return { success: true }
}
