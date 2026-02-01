'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supplierSchema, type SupplierFormData } from '@/lib/validations/supplier'
import { createAuditLog } from '@/lib/audit'
import { computeChanges } from '@/lib/audit-utils'

export async function getSuppliers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name')

  if (error) throw new Error(error.message)
  return data
}

export async function createSupplier(formData: SupplierFormData) {
  const supabase = await createClient()

  const validated = supplierSchema.safeParse(formData)
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

  const { data: newSupplier, error } = await supabase
    .from('suppliers')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: { code: ['Supplier code already exists'] } }
    }
    return { error: { _form: [error.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    resourceType: 'supplier',
    resourceId: newSupplier.id,
    resourceName: validated.data.name,
    newValues: insertData,
  })

  revalidatePath('/suppliers')
  redirect('/suppliers')
}

export async function updateSupplier(id: string, formData: SupplierFormData) {
  const supabase = await createClient()

  const validated = supplierSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  // Get old values for audit
  const { data: oldSupplier } = await supabase
    .from('suppliers')
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
    .from('suppliers')
    .update(newValues)
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { error: { code: ['Supplier code already exists'] } }
    }
    return { error: { _form: [error.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'update',
    resourceType: 'supplier',
    resourceId: id,
    resourceName: validated.data.name,
    oldValues: oldSupplier,
    newValues,
    changes: computeChanges(oldSupplier, newValues),
  })

  revalidatePath('/suppliers')
  redirect('/suppliers')
}

export async function deleteSupplier(id: string) {
  const supabase = await createClient()

  // Get supplier for audit before deletion
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single()

  // Check for purchase orders
  const { data: orders } = await supabase
    .from('purchase_orders')
    .select('id')
    .eq('supplier_id', id)
    .limit(1)

  if (orders && orders.length > 0) {
    return { error: 'Cannot delete supplier with existing purchase orders. Deactivate instead.' }
  }

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  // Audit log
  await createAuditLog({
    action: 'delete',
    resourceType: 'supplier',
    resourceId: id,
    resourceName: supplier?.name,
    oldValues: supplier,
  })

  revalidatePath('/suppliers')
  return { success: true }
}
