'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { transferSchema, type TransferFormData } from '@/lib/validations/transfer'
import { createAuditLog } from '@/lib/audit'

export async function createTransfer(formData: TransferFormData) {
  const supabase = await createClient()

  const validated = transferSchema.safeParse(formData)
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

  // Generate transfer number
  const { count } = await supabase
    .from('transfers')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', userData.tenant_id)

  const transferNumber = `TRF-${String((count || 0) + 1).padStart(6, '0')}`

  const { data: transfer, error: transferError } = await supabase
    .from('transfers')
    .insert({
      tenant_id: userData.tenant_id,
      transfer_number: transferNumber,
      from_location_id: validated.data.from_location_id,
      to_location_id: validated.data.to_location_id,
      notes: validated.data.notes || null,
      created_by: user.id,
      status: 'draft',
    })
    .select()
    .single()

  if (transferError) {
    return { error: { _form: [transferError.message] } }
  }

  const lines = validated.data.lines.map((line) => ({
    transfer_id: transfer.id,
    product_id: line.product_id,
    qty: line.qty,
    lot_number: line.lot_number || null,
    expiry_date: line.expiry_date || null,
  }))

  const { error: linesError } = await supabase.from('transfer_lines').insert(lines)

  if (linesError) {
    await supabase.from('transfers').delete().eq('id', transfer.id)
    return { error: { _form: [linesError.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    resourceType: 'transfer',
    resourceId: transfer.id,
    resourceName: transferNumber,
    newValues: {
      transfer_number: transferNumber,
      from_location_id: validated.data.from_location_id,
      to_location_id: validated.data.to_location_id,
      lines_count: lines.length,
    },
  })

  revalidatePath('/transfers')
  redirect('/transfers')
}

export async function sendTransfer(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { data: transfer } = await supabase
    .from('transfers')
    .select('*, transfer_number, lines:transfer_lines(*, product:products(id, sku, name))')
    .eq('id', id)
    .single()

  if (!transfer) return { error: 'Transfer not found' }
  if (transfer.status !== 'draft') return { error: 'Can only send draft transfers' }

  const transferredItems: { product_id: string; qty: number }[] = []

  // Check stock availability and deduct from source location
  for (const line of transfer.lines || []) {
    // Check if we have enough stock
    const { data: balance } = await supabase
      .from('inventory_balances')
      .select('qty_on_hand, avg_cost')
      .eq('product_id', line.product_id)
      .eq('location_id', transfer.from_location_id)
      .maybeSingle()

    if (!balance || balance.qty_on_hand < line.qty) {
      return { error: `Insufficient stock for ${line.product?.sku || 'product'}` }
    }

    const unitCost = balance.avg_cost || 0
    transferredItems.push({ product_id: line.product_id, qty: line.qty })

    // Update inventory balance (deduct from source)
    await supabase
      .from('inventory_balances')
      .update({
        qty_on_hand: balance.qty_on_hand - line.qty,
        inventory_value: (balance.qty_on_hand - line.qty) * unitCost,
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', line.product_id)
      .eq('location_id', transfer.from_location_id)

    // Update line with cost
    await supabase
      .from('transfer_lines')
      .update({ unit_cost: unitCost })
      .eq('id', line.id)

    // Record stock movement
    await supabase.from('stock_movements').insert({
      tenant_id: userData?.tenant_id,
      product_id: line.product_id,
      location_id: transfer.from_location_id,
      qty: -line.qty,
      movement_type: 'transfer_out',
      reference_type: 'transfer',
      reference_id: id,
      lot_number: line.lot_number || null,
      expiry_date: line.expiry_date || null,
      unit_cost: unitCost,
      extended_cost: unitCost * line.qty,
      created_by: user.id,
    })
  }

  await supabase
    .from('transfers')
    .update({ status: 'confirmed', sent_at: new Date().toISOString() })
    .eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'transfer',
    resourceType: 'transfer',
    resourceId: id,
    resourceName: transfer.transfer_number,
    oldValues: { status: 'draft' },
    newValues: { status: 'confirmed', transferred_items: transferredItems },
    notes: `Sent ${transferredItems.length} item(s)`,
  })

  revalidatePath('/transfers')
  revalidatePath(`/transfers/${id}`)
  revalidatePath('/stock')
  return { success: true }
}

export async function receiveTransfer(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { data: transfer } = await supabase
    .from('transfers')
    .select('*, transfer_number, lines:transfer_lines(*)')
    .eq('id', id)
    .single()

  if (!transfer) return { error: 'Transfer not found' }
  if (transfer.status !== 'confirmed') return { error: 'Can only receive sent transfers' }

  const receivedItems: { product_id: string; qty: number }[] = []

  for (const line of transfer.lines || []) {
    const unitCost = line.unit_cost || 0
    receivedItems.push({ product_id: line.product_id, qty: line.qty })

    // Check if balance exists at destination
    const { data: existingBalance } = await supabase
      .from('inventory_balances')
      .select('id, qty_on_hand, avg_cost')
      .eq('product_id', line.product_id)
      .eq('location_id', transfer.to_location_id)
      .maybeSingle()

    if (existingBalance) {
      // Update existing balance with weighted average cost
      const newQty = existingBalance.qty_on_hand + line.qty
      const newAvgCost = ((existingBalance.qty_on_hand * existingBalance.avg_cost) + (line.qty * unitCost)) / newQty

      await supabase
        .from('inventory_balances')
        .update({
          qty_on_hand: newQty,
          avg_cost: newAvgCost,
          inventory_value: newQty * newAvgCost,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBalance.id)
    } else {
      // Create new balance
      await supabase.from('inventory_balances').insert({
        tenant_id: userData?.tenant_id,
        product_id: line.product_id,
        location_id: transfer.to_location_id,
        lot_number: line.lot_number || null,
        expiry_date: line.expiry_date || null,
        qty_on_hand: line.qty,
        avg_cost: unitCost,
        inventory_value: line.qty * unitCost,
      })
    }

    // Record stock movement
    await supabase.from('stock_movements').insert({
      tenant_id: userData?.tenant_id,
      product_id: line.product_id,
      location_id: transfer.to_location_id,
      qty: line.qty,
      movement_type: 'transfer_in',
      reference_type: 'transfer',
      reference_id: id,
      lot_number: line.lot_number || null,
      expiry_date: line.expiry_date || null,
      unit_cost: unitCost,
      extended_cost: unitCost * line.qty,
      created_by: user.id,
    })
  }

  await supabase
    .from('transfers')
    .update({ status: 'completed', received_at: new Date().toISOString() })
    .eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'receive',
    resourceType: 'transfer',
    resourceId: id,
    resourceName: transfer.transfer_number,
    oldValues: { status: 'confirmed' },
    newValues: { status: 'completed', received_items: receivedItems },
    notes: `Received ${receivedItems.length} item(s)`,
  })

  revalidatePath('/transfers')
  revalidatePath(`/transfers/${id}`)
  revalidatePath('/stock')
  return { success: true }
}

export async function cancelTransfer(id: string) {
  const supabase = await createClient()

  const { data: transfer } = await supabase
    .from('transfers')
    .select('status, transfer_number')
    .eq('id', id)
    .single()

  if (!transfer) return { error: 'Transfer not found' }
  if (transfer.status !== 'draft') {
    return { error: 'Can only cancel draft transfers' }
  }

  await supabase.from('transfers').update({ status: 'cancelled' }).eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'cancel',
    resourceType: 'transfer',
    resourceId: id,
    resourceName: transfer.transfer_number,
    oldValues: { status: transfer.status },
    newValues: { status: 'cancelled' },
  })

  revalidatePath('/transfers')
  return { success: true }
}
