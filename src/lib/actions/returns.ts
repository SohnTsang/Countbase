'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { returnSchema, type ReturnFormData } from '@/lib/validations/return'
import { createAuditLog } from '@/lib/audit'
import { deleteEntityDocuments } from '@/lib/actions/documents'

export async function createReturn(formData: ReturnFormData) {
  const supabase = await createClient()

  const validated = returnSchema.safeParse(formData)
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

  // Generate return number - get the max existing number to avoid duplicates
  const { data: lastReturn } = await supabase
    .from('returns')
    .select('return_number')
    .eq('tenant_id', userData.tenant_id)
    .order('return_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextNumber = 1
  if (lastReturn?.return_number) {
    const match = lastReturn.return_number.match(/RET-(\d+)/)
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1
    }
  }
  const returnNumber = `RET-${String(nextNumber).padStart(6, '0')}`

  const { data: returnDoc, error: returnError } = await supabase
    .from('returns')
    .insert({
      tenant_id: userData.tenant_id,
      return_number: returnNumber,
      return_type: validated.data.return_type,
      location_id: validated.data.location_id,
      partner_id: validated.data.partner_id || null,
      partner_name: validated.data.partner_name || null,
      reason: validated.data.reason || null,
      notes: validated.data.notes || null,
      created_by: user.id,
      status: 'draft',
    })
    .select()
    .single()

  if (returnError) {
    return { error: { _form: [returnError.message] } }
  }

  const lines = validated.data.lines.map((line) => ({
    return_id: returnDoc.id,
    product_id: line.product_id,
    qty: line.qty,
    lot_number: line.lot_number || null,
    expiry_date: line.expiry_date || null,
  }))

  const { error: linesError } = await supabase.from('return_lines').insert(lines)

  if (linesError) {
    await supabase.from('returns').delete().eq('id', returnDoc.id)
    return { error: { _form: [linesError.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    resourceType: 'return',
    resourceId: returnDoc.id,
    resourceName: returnNumber,
    newValues: {
      return_number: returnNumber,
      return_type: validated.data.return_type,
      location_id: validated.data.location_id,
      reason: validated.data.reason,
      lines_count: lines.length,
    },
  })

  revalidatePath('/returns')
  return { success: true, id: returnDoc.id }
}

export async function updateReturn(id: string, formData: ReturnFormData) {
  const supabase = await createClient()

  const validated = returnSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const { data: ret } = await supabase
    .from('returns')
    .select('status, return_number')
    .eq('id', id)
    .single()

  if (!ret) return { error: { _form: ['Return not found'] } }
  if (ret.status !== 'draft') return { error: { _form: ['Can only edit draft returns'] } }

  const { error: updateError } = await supabase
    .from('returns')
    .update({
      return_type: validated.data.return_type,
      location_id: validated.data.location_id,
      partner_id: validated.data.partner_id || null,
      partner_name: validated.data.partner_name || null,
      reason: validated.data.reason || null,
      notes: validated.data.notes || null,
    })
    .eq('id', id)

  if (updateError) return { error: { _form: [updateError.message] } }

  await supabase.from('return_lines').delete().eq('return_id', id)

  const lines = validated.data.lines.map((line) => ({
    return_id: id,
    product_id: line.product_id,
    qty: line.qty,
    lot_number: line.lot_number || null,
    expiry_date: line.expiry_date || null,
  }))

  const { error: linesError } = await supabase.from('return_lines').insert(lines)
  if (linesError) return { error: { _form: [linesError.message] } }

  await createAuditLog({
    action: 'update',
    resourceType: 'return',
    resourceId: id,
    resourceName: ret.return_number,
    newValues: {
      return_type: validated.data.return_type,
      location_id: validated.data.location_id,
      lines_count: lines.length,
    },
  })

  revalidatePath('/returns')
  revalidatePath(`/returns/${id}`)
  return { success: true }
}

export async function processReturn(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { data: returnDoc } = await supabase
    .from('returns')
    .select('*, return_number, lines:return_lines(*, product:products(id, sku, name))')
    .eq('id', id)
    .single()

  if (!returnDoc) return { error: 'Return not found' }
  if (returnDoc.status !== 'draft') return { error: 'Can only process draft returns' }

  const isCustomerReturn = returnDoc.return_type === 'customer'
  const movementType = isCustomerReturn ? 'return_in' : 'return_out'
  const returnedItems: { product_id: string; qty: number }[] = []

  for (const line of returnDoc.lines || []) {
    // Normalize lot_number and expiry_date
    const lotNumber = line.lot_number?.trim() || null
    const expiryDate = line.expiry_date?.trim() || null

    // Get current balance for cost - filter by lot/expiry for precision
    let balanceQuery = supabase
      .from('inventory_balances')
      .select('id, qty_on_hand, avg_cost')
      .eq('product_id', line.product_id)
      .eq('location_id', returnDoc.location_id)

    if (lotNumber) {
      balanceQuery = balanceQuery.eq('lot_number', lotNumber)
    } else {
      balanceQuery = balanceQuery.or('lot_number.is.null,lot_number.eq.')
    }

    if (expiryDate) {
      balanceQuery = balanceQuery.eq('expiry_date', expiryDate)
    } else {
      balanceQuery = balanceQuery.or('expiry_date.is.null,expiry_date.eq.')
    }

    const { data: balance, error: balanceError } = await balanceQuery.maybeSingle()

    if (balanceError) {
      return { error: `Error finding stock: ${balanceError.message}` }
    }

    const unitCost = balance?.avg_cost || 0
    const qtyChange = isCustomerReturn ? line.qty : -line.qty
    returnedItems.push({ product_id: line.product_id, qty: line.qty })

    if (isCustomerReturn) {
      // Customer return: ADD to inventory
      if (balance) {
        const newQty = balance.qty_on_hand + line.qty
        const newAvgCost = ((balance.qty_on_hand * balance.avg_cost) + (line.qty * unitCost)) / newQty

        const { error: updateError } = await supabase
          .from('inventory_balances')
          .update({
            qty_on_hand: newQty,
            avg_cost: newAvgCost,
            updated_at: new Date().toISOString(),
          })
          .eq('id', balance.id)

        if (updateError) {
          return { error: `Error updating stock: ${updateError.message}` }
        }
      } else {
        const { error: insertError } = await supabase.from('inventory_balances').insert({
          tenant_id: userData?.tenant_id,
          product_id: line.product_id,
          location_id: returnDoc.location_id,
          lot_number: lotNumber,
          expiry_date: expiryDate,
          qty_on_hand: line.qty,
          avg_cost: unitCost,
        })

        if (insertError) {
          return { error: `Error creating stock: ${insertError.message}` }
        }
      }
    } else {
      // Supplier return: REMOVE from inventory
      if (!balance || balance.qty_on_hand < line.qty) {
        return { error: `Insufficient stock for ${line.product?.sku || 'product'}` }
      }

      const { error: updateError } = await supabase
        .from('inventory_balances')
        .update({
          qty_on_hand: balance.qty_on_hand - line.qty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', balance.id)

      if (updateError) {
        return { error: `Error updating stock: ${updateError.message}` }
      }
    }

    // Update line with cost
    await supabase
      .from('return_lines')
      .update({ unit_cost: unitCost })
      .eq('id', line.id)

    // Record stock movement
    await supabase.from('stock_movements').insert({
      tenant_id: userData?.tenant_id,
      product_id: line.product_id,
      location_id: returnDoc.location_id,
      qty: qtyChange,
      movement_type: movementType,
      reference_type: 'return',
      reference_id: id,
      lot_number: lotNumber,
      expiry_date: expiryDate,
      unit_cost: unitCost,
      created_by: user.id,
    })
  }

  await supabase
    .from('returns')
    .update({ status: 'completed' })
    .eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'return',
    resourceType: 'return',
    resourceId: id,
    resourceName: returnDoc.return_number,
    oldValues: { status: 'draft' },
    newValues: { status: 'completed', returned_items: returnedItems },
    notes: `Processed ${returnDoc.return_type} return with ${returnedItems.length} item(s)`,
  })

  revalidatePath('/returns')
  revalidatePath(`/returns/${id}`)
  revalidatePath('/stock')
  revalidatePath('/shipments/new')
  revalidatePath('/transfers/new')
  revalidatePath('/returns/new')
  return { success: true }
}

export async function cancelReturn(id: string) {
  const supabase = await createClient()

  const { data: returnDoc } = await supabase
    .from('returns')
    .select('status, return_number')
    .eq('id', id)
    .single()

  if (!returnDoc) return { error: 'Return not found' }
  if (returnDoc.status !== 'draft') {
    return { error: 'Can only cancel draft returns' }
  }

  await supabase.from('returns').update({ status: 'cancelled' }).eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'cancel',
    resourceType: 'return',
    resourceId: id,
    resourceName: returnDoc.return_number,
    oldValues: { status: returnDoc.status },
    newValues: { status: 'cancelled' },
  })

  revalidatePath('/returns')
  return { success: true }
}

export async function deleteReturn(id: string) {
  const supabase = await createClient()

  const { data: returnDoc } = await supabase
    .from('returns')
    .select('status, return_number')
    .eq('id', id)
    .single()

  if (!returnDoc) return { error: 'Return not found' }
  if (returnDoc.status !== 'draft') {
    return { error: 'Can only delete draft returns' }
  }

  await deleteEntityDocuments('return', id)
  await supabase.from('returns').delete().eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'delete',
    resourceType: 'return',
    resourceId: id,
    resourceName: returnDoc.return_number,
    oldValues: { status: returnDoc.status },
  })

  revalidatePath('/returns')
  return { success: true }
}
