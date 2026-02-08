'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  purchaseOrderSchema,
  receiveSchema,
  type PurchaseOrderFormData,
  type ReceiveFormData,
} from '@/lib/validations/purchase-order'
import { createAuditLog } from '@/lib/audit'
import { deleteEntityDocuments } from '@/lib/actions/documents'

export async function createPurchaseOrder(formData: PurchaseOrderFormData) {
  const supabase = await createClient()

  const validated = purchaseOrderSchema.safeParse(formData)
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

  // Generate PO number
  const { count } = await supabase
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', userData.tenant_id)

  const poNumber = `PO-${String((count || 0) + 1).padStart(6, '0')}`

  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      tenant_id: userData.tenant_id,
      po_number: poNumber,
      supplier_id: validated.data.supplier_id,
      location_id: validated.data.location_id,
      order_date: validated.data.order_date,
      expected_date: validated.data.expected_date || null,
      notes: validated.data.notes || null,
      created_by: user.id,
      status: 'draft',
    })
    .select()
    .single()

  if (poError) {
    return { error: { _form: [poError.message] } }
  }

  const lines = validated.data.lines.map((line) => ({
    po_id: po.id,
    product_id: line.product_id,
    qty_ordered: line.qty_ordered,
    qty_received: 0,
    unit_cost: line.unit_cost,
  }))

  const { error: linesError } = await supabase.from('purchase_order_lines').insert(lines)

  if (linesError) {
    await supabase.from('purchase_orders').delete().eq('id', po.id)
    return { error: { _form: [linesError.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    resourceType: 'purchase_order',
    resourceId: po.id,
    resourceName: poNumber,
    newValues: {
      po_number: poNumber,
      supplier_id: validated.data.supplier_id,
      location_id: validated.data.location_id,
      order_date: validated.data.order_date,
      lines_count: lines.length,
    },
  })

  revalidatePath('/purchase-orders')
  return { success: true, id: po.id }
}

export async function updatePurchaseOrder(id: string, formData: PurchaseOrderFormData) {
  const supabase = await createClient()

  const validated = purchaseOrderSchema.safeParse(formData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Not authenticated'] } }

  const { data: po } = await supabase
    .from('purchase_orders')
    .select('status, po_number')
    .eq('id', id)
    .single()

  if (!po) return { error: { _form: ['Purchase order not found'] } }
  if (po.status !== 'draft') return { error: { _form: ['Can only edit draft POs'] } }

  const { error: updateError } = await supabase
    .from('purchase_orders')
    .update({
      supplier_id: validated.data.supplier_id,
      location_id: validated.data.location_id,
      order_date: validated.data.order_date,
      expected_date: validated.data.expected_date || null,
      notes: validated.data.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) return { error: { _form: [updateError.message] } }

  // Delete old lines and insert new ones
  await supabase.from('purchase_order_lines').delete().eq('po_id', id)

  const lines = validated.data.lines.map((line) => ({
    po_id: id,
    product_id: line.product_id,
    qty_ordered: line.qty_ordered,
    qty_received: 0,
    unit_cost: line.unit_cost,
  }))

  const { error: linesError } = await supabase.from('purchase_order_lines').insert(lines)
  if (linesError) return { error: { _form: [linesError.message] } }

  await createAuditLog({
    action: 'update',
    resourceType: 'purchase_order',
    resourceId: id,
    resourceName: po.po_number,
    newValues: {
      supplier_id: validated.data.supplier_id,
      location_id: validated.data.location_id,
      order_date: validated.data.order_date,
      lines_count: lines.length,
    },
  })

  revalidatePath('/purchase-orders')
  revalidatePath(`/purchase-orders/${id}`)
  return { success: true }
}

export async function confirmPurchaseOrder(id: string) {
  const supabase = await createClient()

  const { data: po } = await supabase
    .from('purchase_orders')
    .select('status, po_number')
    .eq('id', id)
    .single()

  if (!po) return { error: 'Purchase order not found' }
  if (po.status !== 'draft') return { error: 'Can only confirm draft POs' }

  const { error } = await supabase
    .from('purchase_orders')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  // Audit log
  await createAuditLog({
    action: 'confirm',
    resourceType: 'purchase_order',
    resourceId: id,
    resourceName: po.po_number,
    oldValues: { status: po.status },
    newValues: { status: 'confirmed' },
  })

  revalidatePath('/purchase-orders')
  revalidatePath(`/purchase-orders/${id}`)
  return { success: true }
}

export async function receivePurchaseOrder(poId: string, formData: ReceiveFormData) {
  const supabase = await createClient()

  const validated = receiveSchema.safeParse(formData)
  if (!validated.success) {
    return { error: 'Invalid receive data' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: 'User not found' }

  const { data: po } = await supabase
    .from('purchase_orders')
    .select('*, location_id, po_number')
    .eq('id', poId)
    .single()

  if (!po) return { error: 'Purchase order not found' }
  if (po.status === 'draft') return { error: 'PO must be confirmed before receiving' }
  if (po.status === 'completed') return { error: 'PO is already completed' }
  if (po.status === 'cancelled') return { error: 'Cannot receive cancelled PO' }

  const oldStatus = po.status
  const receivedItems: { product_id: string; qty: number }[] = []
  const receivedDate = validated.data.received_date || new Date().toISOString().split('T')[0]

  // Process each line
  for (const line of validated.data.lines) {
    if (line.qty_to_receive <= 0) continue

    // Update PO line qty_received
    const { data: poLine } = await supabase
      .from('purchase_order_lines')
      .select('qty_ordered, qty_received, unit_cost')
      .eq('id', line.line_id)
      .single()

    if (!poLine) continue

    const newReceived = (poLine.qty_received || 0) + line.qty_to_receive
    if (newReceived > poLine.qty_ordered) {
      return { error: `Cannot receive more than ordered for line ${line.line_id}` }
    }

    await supabase
      .from('purchase_order_lines')
      .update({ qty_received: newReceived })
      .eq('id', line.line_id)

    const unitCost = poLine.unit_cost || 0
    receivedItems.push({ product_id: line.product_id, qty: line.qty_to_receive })

    // Update or create inventory balance
    let balanceQuery = supabase
      .from('inventory_balances')
      .select('id, qty_on_hand, avg_cost')
      .eq('product_id', line.product_id)
      .eq('location_id', po.location_id)

    // Handle lot_number: use .eq() for values, .is() for null
    const lotNumber = line.lot_number?.trim() || null
    if (lotNumber) {
      balanceQuery = balanceQuery.eq('lot_number', lotNumber)
    } else {
      balanceQuery = balanceQuery.is('lot_number', null)
    }

    // Handle expiry_date: use .eq() for values, .is() for null
    const expiryDate = line.expiry_date?.trim() || null
    if (expiryDate) {
      balanceQuery = balanceQuery.eq('expiry_date', expiryDate)
    } else {
      balanceQuery = balanceQuery.is('expiry_date', null)
    }

    const { data: existingBalance } = await balanceQuery.maybeSingle()

    if (existingBalance) {
      // Weighted average cost
      const newQty = existingBalance.qty_on_hand + line.qty_to_receive
      const newAvgCost = ((existingBalance.qty_on_hand * existingBalance.avg_cost) +
        (line.qty_to_receive * unitCost)) / newQty

      await supabase
        .from('inventory_balances')
        .update({
          qty_on_hand: newQty,
          avg_cost: newAvgCost,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBalance.id)
    } else {
      await supabase.from('inventory_balances').insert({
        tenant_id: userData.tenant_id,
        product_id: line.product_id,
        location_id: po.location_id,
        lot_number: lotNumber,
        expiry_date: expiryDate,
        qty_on_hand: line.qty_to_receive,
        avg_cost: unitCost,
      })
    }

    // Update product current_cost
    await supabase
      .from('products')
      .update({ current_cost: unitCost, updated_at: new Date().toISOString() })
      .eq('id', line.product_id)

    // Record stock movement
    await supabase.from('stock_movements').insert({
      tenant_id: userData.tenant_id,
      product_id: line.product_id,
      location_id: po.location_id,
      qty: line.qty_to_receive,
      movement_type: 'receive',
      reference_type: 'po',
      reference_id: poId,
      lot_number: lotNumber,
      expiry_date: expiryDate,
      unit_cost: unitCost,
      created_by: user.id,
    })
  }

  // Update PO status
  const { data: allLines } = await supabase
    .from('purchase_order_lines')
    .select('qty_ordered, qty_received')
    .eq('po_id', poId)

  const allComplete = allLines?.every(l => (l.qty_received || 0) >= l.qty_ordered)
  const anyReceived = allLines?.some(l => (l.qty_received || 0) > 0)
  const newStatus = allComplete ? 'completed' : anyReceived ? 'partial' : 'confirmed'

  await supabase
    .from('purchase_orders')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', poId)

  // Audit log
  await createAuditLog({
    action: 'receive',
    resourceType: 'purchase_order',
    resourceId: poId,
    resourceName: po.po_number,
    oldValues: { status: oldStatus },
    newValues: { status: newStatus, received_items: receivedItems, received_date: receivedDate },
    notes: `Received ${receivedItems.length} item(s) on ${receivedDate}`,
  })

  revalidatePath('/purchase-orders')
  revalidatePath(`/purchase-orders/${poId}`)
  revalidatePath('/stock')
  revalidatePath('/shipments/new')
  revalidatePath('/transfers/new')
  revalidatePath('/returns/new')
  return { success: true }
}

export async function cancelPurchaseOrder(id: string) {
  const supabase = await createClient()

  const { data: po } = await supabase
    .from('purchase_orders')
    .select('status, po_number')
    .eq('id', id)
    .single()

  if (!po) return { error: 'Purchase order not found' }
  if (po.status !== 'draft' && po.status !== 'confirmed') {
    return { error: 'Can only cancel draft or confirmed POs' }
  }

  await supabase
    .from('purchase_orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'cancel',
    resourceType: 'purchase_order',
    resourceId: id,
    resourceName: po.po_number,
    oldValues: { status: po.status },
    newValues: { status: 'cancelled' },
  })

  revalidatePath('/purchase-orders')
  revalidatePath(`/purchase-orders/${id}`)
  return { success: true }
}

export async function deletePurchaseOrder(id: string) {
  const supabase = await createClient()

  const { data: po } = await supabase
    .from('purchase_orders')
    .select('status, po_number')
    .eq('id', id)
    .single()

  if (!po) return { error: 'Purchase order not found' }
  if (po.status !== 'draft') {
    return { error: 'Can only delete draft POs' }
  }

  // Clean up attached documents
  await deleteEntityDocuments('purchase_order', id)

  // Lines will be cascade deleted
  await supabase.from('purchase_orders').delete().eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'delete',
    resourceType: 'purchase_order',
    resourceId: id,
    resourceName: po.po_number,
    oldValues: { status: po.status },
  })

  revalidatePath('/purchase-orders')
  return { success: true }
}
