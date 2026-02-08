'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adjustmentSchema, type AdjustmentFormData } from '@/lib/validations/adjustment'
import { createAuditLog } from '@/lib/audit'

export async function createAdjustment(formData: AdjustmentFormData) {
  const supabase = await createClient()

  const validated = adjustmentSchema.safeParse(formData)
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

  // Generate adjustment number
  const { count } = await supabase
    .from('adjustments')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', userData.tenant_id)

  const adjNumber = `ADJ-${String((count || 0) + 1).padStart(6, '0')}`

  const { data: adjustment, error: adjError } = await supabase
    .from('adjustments')
    .insert({
      tenant_id: userData.tenant_id,
      adjustment_number: adjNumber,
      location_id: validated.data.location_id,
      reason: validated.data.reason,
      notes: validated.data.notes || null,
      created_by: user.id,
      status: 'draft',
    })
    .select()
    .single()

  if (adjError) {
    return { error: { _form: [adjError.message] } }
  }

  const lines = validated.data.lines.map((line) => ({
    adjustment_id: adjustment.id,
    product_id: line.product_id,
    qty: line.qty,
    lot_number: line.lot_number || null,
    expiry_date: line.expiry_date || null,
    unit_cost: line.unit_cost || null,
  }))

  const { error: linesError } = await supabase.from('adjustment_lines').insert(lines)

  if (linesError) {
    await supabase.from('adjustments').delete().eq('id', adjustment.id)
    return { error: { _form: [linesError.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    resourceType: 'adjustment',
    resourceId: adjustment.id,
    resourceName: adjNumber,
    newValues: {
      adjustment_number: adjNumber,
      location_id: validated.data.location_id,
      reason: validated.data.reason,
      lines_count: lines.length,
    },
  })

  revalidatePath('/adjustments')
  return { success: true, id: adjustment.id }
}

export async function updateAdjustment(id: string, formData: AdjustmentFormData) {
  const supabase = await createClient()

  const validated = adjustmentSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const { data: adjustment } = await supabase
    .from('adjustments')
    .select('status, adjustment_number')
    .eq('id', id)
    .single()

  if (!adjustment) return { error: { _form: ['Adjustment not found'] } }
  if (adjustment.status !== 'draft') return { error: { _form: ['Can only edit draft adjustments'] } }

  const { error: updateError } = await supabase
    .from('adjustments')
    .update({
      location_id: validated.data.location_id,
      reason: validated.data.reason,
      notes: validated.data.notes || null,
    })
    .eq('id', id)

  if (updateError) return { error: { _form: [updateError.message] } }

  await supabase.from('adjustment_lines').delete().eq('adjustment_id', id)

  const lines = validated.data.lines.map((line) => ({
    adjustment_id: id,
    product_id: line.product_id,
    qty: line.qty,
    lot_number: line.lot_number || null,
    expiry_date: line.expiry_date || null,
    unit_cost: line.unit_cost || null,
  }))

  const { error: linesError } = await supabase.from('adjustment_lines').insert(lines)
  if (linesError) return { error: { _form: [linesError.message] } }

  await createAuditLog({
    action: 'update',
    resourceType: 'adjustment',
    resourceId: id,
    resourceName: adjustment.adjustment_number,
    newValues: {
      location_id: validated.data.location_id,
      reason: validated.data.reason,
      lines_count: lines.length,
    },
  })

  revalidatePath('/adjustments')
  revalidatePath(`/adjustments/${id}`)
  return { success: true }
}

export async function postAdjustment(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.tenant_id) {
    console.error('Failed to get user tenant:', userError)
    return { error: 'Failed to get user data' }
  }

  const { data: adjustment } = await supabase
    .from('adjustments')
    .select('*, adjustment_number, lines:adjustment_lines(*, product:products(id, sku, name))')
    .eq('id', id)
    .single()

  if (!adjustment) return { error: 'Adjustment not found' }
  if (adjustment.status !== 'draft') return { error: 'Can only post draft adjustments' }

  const adjustedItems: { product_id: string; qty: number }[] = []

  for (const line of adjustment.lines || []) {
    // Get current balance to determine cost
    const { data: balance } = await supabase
      .from('inventory_balances')
      .select('id, qty_on_hand, avg_cost')
      .eq('product_id', line.product_id)
      .eq('location_id', adjustment.location_id)
      .maybeSingle()

    // Use user-provided unit_cost if available, otherwise fall back to balance avg_cost
    const unitCost = line.unit_cost ?? balance?.avg_cost ?? 0
    adjustedItems.push({ product_id: line.product_id, qty: line.qty })

    if (line.qty > 0) {
      // Positive adjustment - add stock
      if (balance) {
        const newQty = balance.qty_on_hand + line.qty
        await supabase
          .from('inventory_balances')
          .update({
            qty_on_hand: newQty,
            inventory_value: newQty * unitCost,
            updated_at: new Date().toISOString(),
          })
          .eq('id', balance.id)
      } else {
        await supabase.from('inventory_balances').insert({
          tenant_id: userData.tenant_id,
          product_id: line.product_id,
          location_id: adjustment.location_id,
          lot_number: line.lot_number || null,
          expiry_date: line.expiry_date || null,
          qty_on_hand: line.qty,
          avg_cost: 0,
          inventory_value: 0,
        })
      }
    } else {
      // Negative adjustment - remove stock
      if (!balance || balance.qty_on_hand < Math.abs(line.qty)) {
        return { error: `Insufficient stock for ${line.product?.sku || 'product'}` }
      }

      const newQty = balance.qty_on_hand + line.qty // line.qty is negative
      await supabase
        .from('inventory_balances')
        .update({
          qty_on_hand: newQty,
          inventory_value: newQty * unitCost,
          updated_at: new Date().toISOString(),
        })
        .eq('id', balance.id)
    }

    // Update line with cost
    await supabase
      .from('adjustment_lines')
      .update({ unit_cost: unitCost })
      .eq('id', line.id)

    // Record stock movement (extended_cost is a generated column, don't insert it)
    const { error: movementError } = await supabase.from('stock_movements').insert({
      tenant_id: userData.tenant_id,
      product_id: line.product_id,
      location_id: adjustment.location_id,
      qty: line.qty,
      movement_type: 'adjustment',
      reference_type: 'adjustment',
      reference_id: id,
      lot_number: line.lot_number || null,
      expiry_date: line.expiry_date || null,
      unit_cost: unitCost,
      reason: adjustment.reason,
      created_by: user.id,
    })

    if (movementError) {
      console.error('Failed to create stock movement:', movementError)
      return { error: `Failed to record stock movement: ${movementError.message}` }
    }
  }

  await supabase
    .from('adjustments')
    .update({ status: 'completed' })
    .eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'adjust',
    resourceType: 'adjustment',
    resourceId: id,
    resourceName: adjustment.adjustment_number,
    oldValues: { status: 'draft' },
    newValues: { status: 'completed', adjusted_items: adjustedItems },
    notes: `Posted adjustment with ${adjustedItems.length} item(s), reason: ${adjustment.reason}`,
  })

  revalidatePath('/adjustments')
  revalidatePath(`/adjustments/${id}`)
  revalidatePath('/stock')
  revalidatePath('/shipments/new')
  revalidatePath('/transfers/new')
  revalidatePath('/returns/new')
  return { success: true }
}

export async function cancelAdjustment(id: string) {
  const supabase = await createClient()

  const { data: adjustment } = await supabase
    .from('adjustments')
    .select('status, adjustment_number')
    .eq('id', id)
    .single()

  if (!adjustment) return { error: 'Adjustment not found' }
  if (adjustment.status !== 'draft') return { error: 'Can only cancel draft adjustments' }

  await supabase.from('adjustments').update({ status: 'cancelled' }).eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'cancel',
    resourceType: 'adjustment',
    resourceId: id,
    resourceName: adjustment.adjustment_number,
    oldValues: { status: adjustment.status },
    newValues: { status: 'cancelled' },
  })

  revalidatePath('/adjustments')
  return { success: true }
}
