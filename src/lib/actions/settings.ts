'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  profileSchema,
  organizationSchema,
  type ProfileFormData,
  type OrganizationFormData,
} from '@/lib/validations/settings'
import { createAuditLog } from '@/lib/audit'
import { computeChanges } from '@/lib/audit-utils'

export async function updateProfile(formData: ProfileFormData) {
  const supabase = await createClient()

  const validated = profileSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Not authenticated'] } }

  const { data: currentUser } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single()

  if (!currentUser) return { error: { _form: ['User not found'] } }

  const { error } = await supabase
    .from('users')
    .update({ name: validated.data.name })
    .eq('id', user.id)

  if (error) {
    return { error: { _form: [error.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'update',
    resourceType: 'user',
    resourceId: user.id,
    resourceName: validated.data.name,
    oldValues: { name: currentUser.name },
    newValues: { name: validated.data.name },
    changes: computeChanges({ name: currentUser.name }, { name: validated.data.name }),
    notes: 'Profile name updated',
  })

  revalidatePath('/settings')
  return { success: true }
}

export async function updateOrganization(formData: OrganizationFormData) {
  const supabase = await createClient()

  const validated = organizationSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Not authenticated'] } }

  const { data: currentUser } = await supabase
    .from('users')
    .select('tenant_id, role, tenant:tenants(*)')
    .eq('id', user.id)
    .single()

  if (!currentUser) return { error: { _form: ['User not found'] } }

  // Only admin can update organization settings
  if (currentUser.role !== 'admin') {
    return { error: { _form: ['Only admins can update organization settings'] } }
  }

  const tenant = currentUser.tenant as { name?: string; settings?: { default_currency?: string; require_adjustment_approval?: boolean } } | null
  const oldValues = {
    name: tenant?.name,
    default_currency: tenant?.settings?.default_currency || 'USD',
    require_adjustment_approval: tenant?.settings?.require_adjustment_approval || false,
  }

  const newSettings = {
    ...tenant?.settings,
    default_currency: validated.data.default_currency,
    require_adjustment_approval: validated.data.require_adjustment_approval,
  }

  const { error } = await supabase
    .from('tenants')
    .update({
      name: validated.data.name,
      settings: newSettings,
    })
    .eq('id', currentUser.tenant_id)

  if (error) {
    return { error: { _form: [error.message] } }
  }

  const newValues = {
    name: validated.data.name,
    default_currency: validated.data.default_currency,
    require_adjustment_approval: validated.data.require_adjustment_approval,
  }

  // Audit log
  await createAuditLog({
    action: 'update',
    resourceType: 'tenant',
    resourceId: currentUser.tenant_id,
    resourceName: validated.data.name,
    oldValues,
    newValues,
    changes: computeChanges(oldValues, newValues),
    notes: 'Organization settings updated',
  })

  revalidatePath('/settings')
  return { success: true }
}
