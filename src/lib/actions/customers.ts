'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { customerSchema, type CustomerFormData } from '@/lib/validations/customer'
import { createAuditLog } from '@/lib/audit'
import { computeChanges } from '@/lib/audit-utils'

export async function createCustomer(formData: CustomerFormData) {
  const supabase = await createClient()

  const validated = customerSchema.safeParse(formData)
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

  const insertData = {
    tenant_id: userData.tenant_id,
    code: validated.data.code || null,
    name: validated.data.name,
    contact_name: validated.data.contact_name || null,
    email: validated.data.email || null,
    phone: validated.data.phone || null,
    address: validated.data.address || {},
    active: validated.data.active,
  }

  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return { error: { _form: [error.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    resourceType: 'customer',
    resourceId: newCustomer.id,
    resourceName: validated.data.name,
    newValues: insertData,
  })

  revalidatePath('/customers')
  redirect('/customers')
}

export async function updateCustomer(id: string, formData: CustomerFormData) {
  const supabase = await createClient()

  const validated = customerSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  // Get old values for audit
  const { data: oldCustomer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  const newValues = {
    code: validated.data.code || null,
    name: validated.data.name,
    contact_name: validated.data.contact_name || null,
    email: validated.data.email || null,
    phone: validated.data.phone || null,
    address: validated.data.address || {},
    active: validated.data.active,
  }

  const { error } = await supabase
    .from('customers')
    .update(newValues)
    .eq('id', id)

  if (error) {
    return { error: { _form: [error.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'update',
    resourceType: 'customer',
    resourceId: id,
    resourceName: validated.data.name,
    oldValues: oldCustomer,
    newValues,
    changes: computeChanges(oldCustomer, newValues),
  })

  revalidatePath('/customers')
  redirect('/customers')
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient()

  // Get customer for audit before deletion
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  const { data: shipments } = await supabase
    .from('shipments')
    .select('id')
    .eq('customer_id', id)
    .limit(1)

  if (shipments && shipments.length > 0) {
    return { error: 'Cannot delete customer with existing shipments. Deactivate instead.' }
  }

  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) return { error: error.message }

  // Audit log
  await createAuditLog({
    action: 'delete',
    resourceType: 'customer',
    resourceId: id,
    resourceName: customer?.name,
    oldValues: customer,
  })

  revalidatePath('/customers')
  return { success: true }
}
