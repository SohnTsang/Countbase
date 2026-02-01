'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { shipmentSchema, type ShipmentFormData } from '@/lib/validations/shipment'
import { createAuditLog } from '@/lib/audit'

export async function createShipment(formData: ShipmentFormData) {
  const supabase = await createClient()

  const validated = shipmentSchema.safeParse(formData)
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

  // Generate shipment number
  const { count } = await supabase
    .from('shipments')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', userData.tenant_id)

  const shipmentNumber = `SHP-${String((count || 0) + 1).padStart(6, '0')}`

  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .insert({
      tenant_id: userData.tenant_id,
      shipment_number: shipmentNumber,
      location_id: validated.data.location_id,
      customer_id: validated.data.customer_id || null,
      customer_name: validated.data.customer_name || null,
      ship_date: validated.data.ship_date || null,
      notes: validated.data.notes || null,
      created_by: user.id,
      status: 'draft',
    })
    .select()
    .single()

  if (shipmentError) {
    return { error: { _form: [shipmentError.message] } }
  }

  const lines = validated.data.lines.map((line) => ({
    shipment_id: shipment.id,
    product_id: line.product_id,
    qty: line.qty,
    lot_number: line.lot_number || null,
    expiry_date: line.expiry_date || null,
  }))

  const { error: linesError } = await supabase.from('shipment_lines').insert(lines)

  if (linesError) {
    await supabase.from('shipments').delete().eq('id', shipment.id)
    return { error: { _form: [linesError.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    resourceType: 'shipment',
    resourceId: shipment.id,
    resourceName: shipmentNumber,
    newValues: {
      shipment_number: shipmentNumber,
      location_id: validated.data.location_id,
      customer_id: validated.data.customer_id,
      lines_count: lines.length,
    },
  })

  revalidatePath('/shipments')
  redirect('/shipments')
}

export async function confirmShipment(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: shipment } = await supabase
    .from('shipments')
    .select('*, shipment_number, lines:shipment_lines(*, product:products(id, sku, name))')
    .eq('id', id)
    .single()

  if (!shipment) return { error: 'Shipment not found' }
  if (shipment.status !== 'draft') return { error: 'Can only confirm draft shipments' }

  // Check stock availability for all lines
  for (const line of shipment.lines || []) {
    const { data: balance } = await supabase
      .from('inventory_balances')
      .select('qty_on_hand')
      .eq('product_id', line.product_id)
      .eq('location_id', shipment.location_id)
      .maybeSingle()

    if (!balance || balance.qty_on_hand < line.qty) {
      return { error: `Insufficient stock for ${line.product?.sku || 'product'}` }
    }
  }

  await supabase
    .from('shipments')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'confirm',
    resourceType: 'shipment',
    resourceId: id,
    resourceName: shipment.shipment_number,
    oldValues: { status: 'draft' },
    newValues: { status: 'confirmed' },
  })

  revalidatePath('/shipments')
  revalidatePath(`/shipments/${id}`)
  return { success: true }
}

export async function shipShipment(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { data: shipment } = await supabase
    .from('shipments')
    .select('*, shipment_number, lines:shipment_lines(*, product:products(id, sku, name))')
    .eq('id', id)
    .single()

  if (!shipment) return { error: 'Shipment not found' }
  if (shipment.status !== 'confirmed') return { error: 'Can only ship confirmed shipments' }

  const shippedItems: { product_id: string; qty: number }[] = []

  // Deduct stock and record movements
  for (const line of shipment.lines || []) {
    const { data: balance } = await supabase
      .from('inventory_balances')
      .select('qty_on_hand, avg_cost')
      .eq('product_id', line.product_id)
      .eq('location_id', shipment.location_id)
      .maybeSingle()

    if (!balance || balance.qty_on_hand < line.qty) {
      return { error: `Insufficient stock for ${line.product?.sku || 'product'}` }
    }

    const unitCost = balance.avg_cost || 0
    shippedItems.push({ product_id: line.product_id, qty: line.qty })

    // Deduct from inventory
    await supabase
      .from('inventory_balances')
      .update({
        qty_on_hand: balance.qty_on_hand - line.qty,
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', line.product_id)
      .eq('location_id', shipment.location_id)

    // Update line with cost
    await supabase
      .from('shipment_lines')
      .update({ unit_cost: unitCost })
      .eq('id', line.id)

    // Record stock movement
    await supabase.from('stock_movements').insert({
      tenant_id: userData?.tenant_id,
      product_id: line.product_id,
      location_id: shipment.location_id,
      qty: -line.qty,
      movement_type: 'ship',
      reference_type: 'shipment',
      reference_id: id,
      lot_number: line.lot_number || null,
      expiry_date: line.expiry_date || null,
      unit_cost: unitCost,
      created_by: user.id,
    })
  }

  await supabase
    .from('shipments')
    .update({
      status: 'completed',
      ship_date: shipment.ship_date || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'ship',
    resourceType: 'shipment',
    resourceId: id,
    resourceName: shipment.shipment_number,
    oldValues: { status: 'confirmed' },
    newValues: { status: 'completed', shipped_items: shippedItems },
    notes: `Shipped ${shippedItems.length} item(s)`,
  })

  revalidatePath('/shipments')
  revalidatePath(`/shipments/${id}`)
  revalidatePath('/stock')
  return { success: true }
}

export async function cancelShipment(id: string) {
  const supabase = await createClient()

  const { data: shipment } = await supabase
    .from('shipments')
    .select('status, shipment_number')
    .eq('id', id)
    .single()

  if (!shipment) return { error: 'Shipment not found' }
  if (shipment.status !== 'draft' && shipment.status !== 'confirmed') {
    return { error: 'Can only cancel draft or confirmed shipments' }
  }

  await supabase
    .from('shipments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'cancel',
    resourceType: 'shipment',
    resourceId: id,
    resourceName: shipment.shipment_number,
    oldValues: { status: shipment.status },
    newValues: { status: 'cancelled' },
  })

  revalidatePath('/shipments')
  revalidatePath(`/shipments/${id}`)
  return { success: true }
}

export async function deleteShipment(id: string) {
  const supabase = await createClient()

  const { data: shipment } = await supabase
    .from('shipments')
    .select('status, shipment_number')
    .eq('id', id)
    .single()

  if (!shipment) return { error: 'Shipment not found' }
  if (shipment.status !== 'draft') {
    return { error: 'Can only delete draft shipments' }
  }

  await supabase.from('shipments').delete().eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'delete',
    resourceType: 'shipment',
    resourceId: id,
    resourceName: shipment.shipment_number,
    oldValues: { status: shipment.status },
  })

  revalidatePath('/shipments')
  return { success: true }
}
