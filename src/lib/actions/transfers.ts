'use server'

import { revalidatePath } from 'next/cache'
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

  // Build lines with unit_cost from inventory balance
  const lines = []
  for (const line of validated.data.lines) {
    // Normalize lot_number and expiry_date
    const lotNumber = line.lot_number?.trim() || null
    const expiryDate = line.expiry_date?.trim() || null

    // Get avg_cost from inventory balance for this product/location/lot/expiry
    let balanceQuery = supabase
      .from('inventory_balances')
      .select('avg_cost')
      .eq('product_id', line.product_id)
      .eq('location_id', validated.data.from_location_id)

    if (lotNumber) {
      balanceQuery = balanceQuery.eq('lot_number', lotNumber)
    } else {
      balanceQuery = balanceQuery.is('lot_number', null)
    }

    if (expiryDate) {
      balanceQuery = balanceQuery.eq('expiry_date', expiryDate)
    } else {
      balanceQuery = balanceQuery.is('expiry_date', null)
    }

    const { data: balance } = await balanceQuery.maybeSingle()

    lines.push({
      transfer_id: transfer.id,
      product_id: line.product_id,
      qty: line.qty,
      lot_number: lotNumber,
      expiry_date: expiryDate,
      unit_cost: balance?.avg_cost || 0,
    })
  }

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
  return { success: true, id: transfer.id }
}

export async function updateTransfer(id: string, formData: TransferFormData) {
  const supabase = await createClient()

  const validated = transferSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const { data: transfer } = await supabase
    .from('transfers')
    .select('status, transfer_number')
    .eq('id', id)
    .single()

  if (!transfer) return { error: { _form: ['Transfer not found'] } }
  if (transfer.status !== 'draft') return { error: { _form: ['Can only edit draft transfers'] } }

  const { error: updateError } = await supabase
    .from('transfers')
    .update({
      from_location_id: validated.data.from_location_id,
      to_location_id: validated.data.to_location_id,
      notes: validated.data.notes || null,
    })
    .eq('id', id)

  if (updateError) return { error: { _form: [updateError.message] } }

  await supabase.from('transfer_lines').delete().eq('transfer_id', id)

  const lines = []
  for (const line of validated.data.lines) {
    const lotNumber = line.lot_number?.trim() || null
    const expiryDate = line.expiry_date?.trim() || null

    let balanceQuery = supabase
      .from('inventory_balances')
      .select('avg_cost')
      .eq('product_id', line.product_id)
      .eq('location_id', validated.data.from_location_id)

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

    const { data: balance } = await balanceQuery.maybeSingle()

    lines.push({
      transfer_id: id,
      product_id: line.product_id,
      qty: line.qty,
      lot_number: lotNumber,
      expiry_date: expiryDate,
      unit_cost: balance?.avg_cost || 0,
    })
  }

  const { error: linesError } = await supabase.from('transfer_lines').insert(lines)
  if (linesError) return { error: { _form: [linesError.message] } }

  await createAuditLog({
    action: 'update',
    resourceType: 'transfer',
    resourceId: id,
    resourceName: transfer.transfer_number,
    newValues: {
      from_location_id: validated.data.from_location_id,
      to_location_id: validated.data.to_location_id,
      lines_count: lines.length,
    },
  })

  revalidatePath('/transfers')
  revalidatePath(`/transfers/${id}`)
  return { success: true }
}

export async function sendTransfer(id: string, sentDate?: string) {
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
    // Normalize lot_number and expiry_date
    const lotNumber = line.lot_number?.trim() || null
    const expiryDate = line.expiry_date?.trim() || null

    // Build query with lot/expiry filters
    // Handle both NULL and empty string for lot_number and expiry_date
    let balanceQuery = supabase
      .from('inventory_balances')
      .select('id, qty_on_hand, avg_cost')
      .eq('product_id', line.product_id)
      .eq('location_id', transfer.from_location_id)

    if (lotNumber) {
      balanceQuery = balanceQuery.eq('lot_number', lotNumber)
    } else {
      // Match both NULL and empty string
      balanceQuery = balanceQuery.or('lot_number.is.null,lot_number.eq.')
    }

    if (expiryDate) {
      balanceQuery = balanceQuery.eq('expiry_date', expiryDate)
    } else {
      // Match both NULL and empty string
      balanceQuery = balanceQuery.or('expiry_date.is.null,expiry_date.eq.')
    }

    const { data: balance, error: balanceError } = await balanceQuery.maybeSingle()

    if (balanceError) {
      return { error: `Error finding stock: ${balanceError.message}` }
    }

    if (!balance || balance.qty_on_hand < line.qty) {
      return { error: `Insufficient stock for ${line.product?.sku || 'product'}` }
    }

    const unitCost = balance.avg_cost || 0
    transferredItems.push({ product_id: line.product_id, qty: line.qty })

    // Update inventory balance (deduct from source using balance id)
    const { error: updateError } = await supabase
      .from('inventory_balances')
      .update({
        qty_on_hand: balance.qty_on_hand - line.qty,
        inventory_value: (balance.qty_on_hand - line.qty) * unitCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', balance.id)

    if (updateError) {
      return { error: `Error updating stock: ${updateError.message}` }
    }

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
      lot_number: lotNumber,
      expiry_date: expiryDate,
      unit_cost: unitCost,
      extended_cost: unitCost * line.qty,
      created_by: user.id,
    })
  }

  await supabase
    .from('transfers')
    .update({
      status: 'confirmed',
      sent_at: sentDate || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
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
  revalidatePath('/shipments/new')
  revalidatePath('/transfers/new')
  revalidatePath('/returns/new')
  return { success: true }
}

export async function receiveTransfer(id: string, receivedDate?: string) {
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
    // Normalize lot_number and expiry_date
    const lotNumber = line.lot_number?.trim() || null
    const expiryDate = line.expiry_date?.trim() || null
    const unitCost = line.unit_cost || 0
    receivedItems.push({ product_id: line.product_id, qty: line.qty })

    // Build query with lot/expiry filters for destination
    // Handle both NULL and empty string for lot_number and expiry_date
    let balanceQuery = supabase
      .from('inventory_balances')
      .select('id, qty_on_hand, avg_cost')
      .eq('product_id', line.product_id)
      .eq('location_id', transfer.to_location_id)

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

    const { data: existingBalance, error: balanceError } = await balanceQuery.maybeSingle()

    if (balanceError) {
      return { error: `Error finding destination stock: ${balanceError.message}` }
    }

    if (existingBalance) {
      // Update existing balance with weighted average cost
      const newQty = existingBalance.qty_on_hand + line.qty
      const newAvgCost = ((existingBalance.qty_on_hand * (existingBalance.avg_cost || 0)) + (line.qty * unitCost)) / newQty

      const { error: updateError } = await supabase
        .from('inventory_balances')
        .update({
          qty_on_hand: newQty,
          avg_cost: newAvgCost,
          inventory_value: newQty * newAvgCost,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBalance.id)

      if (updateError) {
        return { error: `Error updating destination stock: ${updateError.message}` }
      }
    } else {
      // Create new balance
      const { error: insertError } = await supabase.from('inventory_balances').insert({
        tenant_id: userData?.tenant_id,
        product_id: line.product_id,
        location_id: transfer.to_location_id,
        lot_number: lotNumber,
        expiry_date: expiryDate,
        qty_on_hand: line.qty,
        avg_cost: unitCost,
        inventory_value: line.qty * unitCost,
      })

      if (insertError) {
        return { error: `Error creating destination stock: ${insertError.message}` }
      }
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
      lot_number: lotNumber,
      expiry_date: expiryDate,
      unit_cost: unitCost,
      extended_cost: unitCost * line.qty,
      created_by: user.id,
    })
  }

  await supabase
    .from('transfers')
    .update({
      status: 'completed',
      received_at: receivedDate || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
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
  revalidatePath('/shipments/new')
  revalidatePath('/transfers/new')
  revalidatePath('/returns/new')
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
