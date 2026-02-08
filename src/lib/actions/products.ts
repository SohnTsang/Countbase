'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { productSchema, type ProductFormData } from '@/lib/validations/product'
import { createAuditLog } from '@/lib/audit'
import { computeChanges } from '@/lib/audit-utils'
import { deleteEntityDocuments } from '@/lib/actions/documents'

export async function getProducts() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(id, name)')
    .order('sku', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getProduct(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(id, name)')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function createProduct(formData: ProductFormData) {
  const supabase = await createClient()

  // Validate
  const validated = productSchema.safeParse(formData)
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
  const { data: newProduct, error } = await supabase.from('products').insert({
    tenant_id: userData.tenant_id,
    ...validated.data,
    pack_uom_name: validated.data.pack_uom_name || null,
    pack_qty_in_base: validated.data.pack_qty_in_base || null,
    barcode: validated.data.barcode || null,
    category_id: validated.data.category_id || null,
  }).select().single()

  if (error) {
    if (error.code === '23505') {
      return { error: { sku: ['SKU already exists'] } }
    }
    return { error: { _form: [error.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    resourceType: 'product',
    resourceId: newProduct.id,
    resourceName: `${newProduct.sku} - ${newProduct.name}`,
    newValues: validated.data,
  })

  revalidatePath('/products')
  return { success: true, id: newProduct.id }
}

export async function updateProduct(id: string, formData: ProductFormData) {
  const supabase = await createClient()

  // Validate
  const validated = productSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  // Get old values for audit
  const { data: oldProduct } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  // Update
  const { data: updatedProduct, error } = await supabase
    .from('products')
    .update({
      ...validated.data,
      pack_uom_name: validated.data.pack_uom_name || null,
      pack_qty_in_base: validated.data.pack_qty_in_base || null,
      barcode: validated.data.barcode || null,
      category_id: validated.data.category_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: { sku: ['SKU already exists'] } }
    }
    return { error: { _form: [error.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'update',
    resourceType: 'product',
    resourceId: id,
    resourceName: `${updatedProduct.sku} - ${updatedProduct.name}`,
    oldValues: oldProduct,
    newValues: validated.data,
    changes: computeChanges(oldProduct, validated.data),
  })

  revalidatePath('/products')
  return { success: true }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()

  // Get product info for audit
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  // Check if product has inventory
  const { data: inventory } = await supabase
    .from('inventory_balances')
    .select('id')
    .eq('product_id', id)
    .limit(1)

  if (inventory && inventory.length > 0) {
    return { error: 'Cannot delete product with existing inventory. Deactivate it instead.' }
  }

  // Check if product is used in any documents
  const { data: poLines } = await supabase
    .from('purchase_order_lines')
    .select('id')
    .eq('product_id', id)
    .limit(1)

  if (poLines && poLines.length > 0) {
    return { error: 'Cannot delete product used in purchase orders. Deactivate it instead.' }
  }

  await deleteEntityDocuments('product', id)

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Audit log
  if (product) {
    await createAuditLog({
      action: 'delete',
      resourceType: 'product',
      resourceId: id,
      resourceName: `${product.sku} - ${product.name}`,
      oldValues: product,
    })
  }

  revalidatePath('/products')
  return { success: true }
}

export async function toggleProductActive(id: string, active: boolean) {
  const supabase = await createClient()

  // Get product info for audit
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('products')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Audit log
  if (product) {
    await createAuditLog({
      action: 'update',
      resourceType: 'product',
      resourceId: id,
      resourceName: `${product.sku} - ${product.name}`,
      oldValues: { active: product.active },
      newValues: { active },
      changes: { active: { old: product.active, new: active } },
      notes: active ? 'Activated product' : 'Deactivated product',
    })
  }

  revalidatePath('/products')
  return { success: true }
}
