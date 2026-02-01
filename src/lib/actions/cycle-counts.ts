'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  cycleCountSchema,
  countEntrySchema,
  type CycleCountFormData,
  type CountEntryFormData,
} from '@/lib/validations/cycle-count'
import { createAuditLog } from '@/lib/audit'

export async function createCycleCount(formData: CycleCountFormData) {
  const supabase = await createClient()

  const validated = cycleCountSchema.safeParse(formData)
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

  // Generate count number
  const { count } = await supabase
    .from('cycle_counts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', userData.tenant_id)

  const countNumber = `CNT-${String((count || 0) + 1).padStart(6, '0')}`

  // Get current system quantities for each product at this location
  const productIds = validated.data.lines.map(l => l.product_id)
  const { data: balances } = await supabase
    .from('inventory_balances')
    .select('product_id, qty_on_hand')
    .eq('location_id', validated.data.location_id)
    .in('product_id', productIds)

  const balanceMap = new Map(balances?.map(b => [b.product_id, b.qty_on_hand]) || [])

  const { data: cycleCount, error: countError } = await supabase
    .from('cycle_counts')
    .insert({
      tenant_id: userData.tenant_id,
      count_number: countNumber,
      location_id: validated.data.location_id,
      count_date: validated.data.count_date,
      notes: validated.data.notes || null,
      created_by: user.id,
      status: 'draft',
    })
    .select()
    .single()

  if (countError) {
    return { error: { _form: [countError.message] } }
  }

  const lines = validated.data.lines.map((line) => ({
    count_id: cycleCount.id,
    product_id: line.product_id,
    system_qty: balanceMap.get(line.product_id) || 0,
    counted_qty: null,
    lot_number: line.lot_number || null,
    expiry_date: line.expiry_date || null,
  }))

  const { error: linesError } = await supabase.from('cycle_count_lines').insert(lines)

  if (linesError) {
    await supabase.from('cycle_counts').delete().eq('id', cycleCount.id)
    return { error: { _form: [linesError.message] } }
  }

  // Audit log
  await createAuditLog({
    action: 'create',
    resourceType: 'cycle_count',
    resourceId: cycleCount.id,
    resourceName: countNumber,
    newValues: {
      count_number: countNumber,
      location_id: validated.data.location_id,
      count_date: validated.data.count_date,
      lines_count: lines.length,
    },
  })

  revalidatePath('/cycle-counts')
  redirect('/cycle-counts')
}

export async function updateCountedQty(countId: string, formData: CountEntryFormData) {
  const supabase = await createClient()

  const validated = countEntrySchema.safeParse(formData)
  if (!validated.success) {
    return { error: 'Invalid count data' }
  }

  const { data: cycleCount } = await supabase
    .from('cycle_counts')
    .select('status, count_number')
    .eq('id', countId)
    .single()

  if (!cycleCount) return { error: 'Cycle count not found' }
  if (cycleCount.status !== 'draft') return { error: 'Can only update draft counts' }

  for (const line of validated.data.lines) {
    await supabase
      .from('cycle_count_lines')
      .update({ counted_qty: line.counted_qty })
      .eq('id', line.line_id)
  }

  // Audit log
  await createAuditLog({
    action: 'update',
    resourceType: 'cycle_count',
    resourceId: countId,
    resourceName: cycleCount.count_number,
    notes: `Updated counted quantities for ${validated.data.lines.length} line(s)`,
  })

  revalidatePath('/cycle-counts')
  revalidatePath(`/cycle-counts/${countId}`)
  return { success: true }
}

export async function postCycleCount(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { data: cycleCount } = await supabase
    .from('cycle_counts')
    .select('*, count_number, lines:cycle_count_lines(*, product:products(id, sku, name))')
    .eq('id', id)
    .single()

  if (!cycleCount) return { error: 'Cycle count not found' }
  if (cycleCount.status !== 'draft') return { error: 'Can only post draft counts' }

  // Check all lines have been counted
  const uncountedLines = cycleCount.lines?.filter((l: { counted_qty: number | null }) => l.counted_qty === null)
  if (uncountedLines?.length > 0) {
    return { error: 'All lines must be counted before posting' }
  }

  const countedItems: { product_id: string; system_qty: number; counted_qty: number; variance: number }[] = []

  // Create adjustments for variances
  for (const line of cycleCount.lines || []) {
    const variance = (line.counted_qty || 0) - line.system_qty
    countedItems.push({
      product_id: line.product_id,
      system_qty: line.system_qty,
      counted_qty: line.counted_qty || 0,
      variance,
    })

    if (variance === 0) continue

    // Get current balance for cost
    const { data: balance } = await supabase
      .from('inventory_balances')
      .select('id, qty_on_hand, avg_cost')
      .eq('product_id', line.product_id)
      .eq('location_id', cycleCount.location_id)
      .maybeSingle()

    const unitCost = balance?.avg_cost || 0

    if (balance) {
      // Update existing balance
      await supabase
        .from('inventory_balances')
        .update({
          qty_on_hand: line.counted_qty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', balance.id)
    } else if (line.counted_qty > 0) {
      // Create new balance
      await supabase.from('inventory_balances').insert({
        tenant_id: userData?.tenant_id,
        product_id: line.product_id,
        location_id: cycleCount.location_id,
        lot_number: line.lot_number || null,
        expiry_date: line.expiry_date || null,
        qty_on_hand: line.counted_qty,
        avg_cost: 0,
      })
    }

    // Record stock movement
    await supabase.from('stock_movements').insert({
      tenant_id: userData?.tenant_id,
      product_id: line.product_id,
      location_id: cycleCount.location_id,
      qty: variance,
      movement_type: 'count_variance',
      reference_type: 'cycle_count',
      reference_id: id,
      lot_number: line.lot_number || null,
      expiry_date: line.expiry_date || null,
      unit_cost: unitCost,
      reason: 'count_variance',
      created_by: user.id,
    })
  }

  await supabase
    .from('cycle_counts')
    .update({ status: 'completed' })
    .eq('id', id)

  // Audit log
  const totalVariance = countedItems.reduce((sum, item) => sum + Math.abs(item.variance), 0)
  await createAuditLog({
    action: 'count',
    resourceType: 'cycle_count',
    resourceId: id,
    resourceName: cycleCount.count_number,
    oldValues: { status: 'draft' },
    newValues: { status: 'completed', counted_items: countedItems },
    notes: `Posted cycle count with ${countedItems.length} item(s), total variance: ${totalVariance}`,
  })

  revalidatePath('/cycle-counts')
  revalidatePath(`/cycle-counts/${id}`)
  revalidatePath('/stock')
  return { success: true }
}

export async function cancelCycleCount(id: string) {
  const supabase = await createClient()

  const { data: cycleCount } = await supabase
    .from('cycle_counts')
    .select('status, count_number')
    .eq('id', id)
    .single()

  if (!cycleCount) return { error: 'Cycle count not found' }
  if (cycleCount.status !== 'draft') {
    return { error: 'Can only cancel draft counts' }
  }

  await supabase.from('cycle_counts').update({ status: 'cancelled' }).eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'cancel',
    resourceType: 'cycle_count',
    resourceId: id,
    resourceName: cycleCount.count_number,
    oldValues: { status: cycleCount.status },
    newValues: { status: 'cancelled' },
  })

  revalidatePath('/cycle-counts')
  return { success: true }
}

export async function deleteCycleCount(id: string) {
  const supabase = await createClient()

  const { data: cycleCount } = await supabase
    .from('cycle_counts')
    .select('status, count_number')
    .eq('id', id)
    .single()

  if (!cycleCount) return { error: 'Cycle count not found' }
  if (cycleCount.status !== 'draft') {
    return { error: 'Can only delete draft counts' }
  }

  await supabase.from('cycle_counts').delete().eq('id', id)

  // Audit log
  await createAuditLog({
    action: 'delete',
    resourceType: 'cycle_count',
    resourceId: id,
    resourceName: cycleCount.count_number,
    oldValues: { status: cycleCount.status },
  })

  revalidatePath('/cycle-counts')
  return { success: true }
}
