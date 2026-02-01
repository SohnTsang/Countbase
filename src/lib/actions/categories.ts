'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { categorySchema, type CategoryFormData } from '@/lib/validations/category'
import { createAuditLog } from '@/lib/audit'
import { computeChanges } from '@/lib/audit-utils'

export async function getCategories() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*, parent:categories!parent_id(id, name)')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getCategory(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*, parent:categories!parent_id(id, name)')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function createCategory(formData: CategoryFormData) {
  const supabase = await createClient()

  // Validate
  const validated = categorySchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  // Get user's tenant_id
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Not authenticated'] } }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: { _form: ['User not found'] } }

  // Insert
  const { data: newCategory, error } = await supabase.from('categories').insert({
    tenant_id: userData.tenant_id,
    name: validated.data.name,
    parent_id: validated.data.parent_id || null,
  }).select().single()

  if (error) {
    if (error.code === '23505') {
      return { error: { name: ['Category name already exists'] } }
    }
    return { error: { _form: [error.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    resourceType: 'category',
    resourceId: newCategory.id,
    resourceName: validated.data.name,
    newValues: { name: validated.data.name, parent_id: validated.data.parent_id },
  })

  revalidatePath('/categories')
  redirect('/categories')
}

export async function updateCategory(id: string, formData: CategoryFormData) {
  const supabase = await createClient()

  // Validate
  const validated = categorySchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  // Prevent setting parent to self or creating circular reference
  if (validated.data.parent_id === id) {
    return { error: { parent_id: ['Category cannot be its own parent'] } }
  }

  // Get old values for audit
  const { data: oldCategory } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  const newValues = {
    name: validated.data.name,
    parent_id: validated.data.parent_id || null,
  }

  // Update
  const { error } = await supabase
    .from('categories')
    .update(newValues)
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { error: { name: ['Category name already exists'] } }
    }
    return { error: { _form: [error.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'update',
    resourceType: 'category',
    resourceId: id,
    resourceName: validated.data.name,
    oldValues: oldCategory,
    newValues,
    changes: computeChanges(oldCategory, newValues),
  })

  revalidatePath('/categories')
  redirect('/categories')
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()

  // Get category for audit before deletion
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  // Check if category has products
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('category_id', id)
    .limit(1)

  if (products && products.length > 0) {
    return { error: 'Cannot delete category with existing products. Remove products first.' }
  }

  // Check if category has child categories
  const { data: children } = await supabase
    .from('categories')
    .select('id')
    .eq('parent_id', id)
    .limit(1)

  if (children && children.length > 0) {
    return { error: 'Cannot delete category with subcategories. Delete subcategories first.' }
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Audit log
  await createAuditLog({
    action: 'delete',
    resourceType: 'category',
    resourceId: id,
    resourceName: category?.name,
    oldValues: category,
  })

  revalidatePath('/categories')
  return { success: true }
}
