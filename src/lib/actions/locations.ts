'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { locationSchema, type LocationFormData } from '@/lib/validations/location'
import { createAuditLog } from '@/lib/audit'
import { computeChanges } from '@/lib/audit-utils'
import { deleteEntityDocuments } from '@/lib/actions/documents'

export async function getLocations() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('name')

  if (error) throw new Error(error.message)
  return data
}

export async function createLocation(formData: LocationFormData) {
  const supabase = await createClient()

  const validated = locationSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Not authenticated'] } }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: { _form: ['User not found'] } }

  const { data: newLocation, error } = await supabase.from('locations').insert({
    tenant_id: userData.tenant_id,
    ...validated.data,
    parent_id: validated.data.parent_id || null,
  }).select().single()

  if (error) {
    if (error.code === '23505') {
      return { error: { name: ['Location name already exists'] } }
    }
    return { error: { _form: [error.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    resourceType: 'location',
    resourceId: newLocation.id,
    resourceName: validated.data.name,
    newValues: validated.data,
  })

  revalidatePath('/locations')
  return { success: true, id: newLocation.id }
}

export async function updateLocation(id: string, formData: LocationFormData) {
  const supabase = await createClient()

  const validated = locationSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  // Get old values for audit
  const { data: oldLocation } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .single()

  const newValues = {
    ...validated.data,
    parent_id: validated.data.parent_id || null,
  }

  const { error } = await supabase
    .from('locations')
    .update(newValues)
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { error: { name: ['Location name already exists'] } }
    }
    return { error: { _form: [error.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'update',
    resourceType: 'location',
    resourceId: id,
    resourceName: validated.data.name,
    oldValues: oldLocation,
    newValues,
    changes: computeChanges(oldLocation, newValues),
  })

  revalidatePath('/locations')
  return { success: true }
}

export async function deleteLocation(id: string) {
  const supabase = await createClient()

  // Get location for audit before deletion
  const { data: location } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .single()

  // Check for inventory
  const { data: inventory } = await supabase
    .from('inventory_balances')
    .select('id')
    .eq('location_id', id)
    .limit(1)

  if (inventory && inventory.length > 0) {
    return { error: 'Cannot delete location with existing inventory' }
  }

  await deleteEntityDocuments('location', id)

  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  // Audit log
  await createAuditLog({
    action: 'delete',
    resourceType: 'location',
    resourceId: id,
    resourceName: location?.name,
    oldValues: location,
  })

  revalidatePath('/locations')
  return { success: true }
}
