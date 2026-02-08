'use server'

import { createClient } from '@/lib/supabase/server'
import type { StockMovement } from '@/types'

interface GetStockMovementsParams {
  productId: string
  locationId: string
  lotNumber?: string | null
}

export interface StockMovementWithDetails extends StockMovement {
  document_number?: string
  partner_name?: string
  from_location_name?: string
  to_location_name?: string
}

export async function getStockMovements({
  productId,
  locationId,
  lotNumber,
}: GetStockMovementsParams): Promise<{ data: StockMovementWithDetails[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  let query = supabase
    .from('stock_movements')
    .select(`
      *,
      product:products(id, sku, name, base_uom),
      location:locations(id, name)
    `)
    .eq('product_id', productId)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (lotNumber) {
    query = query.eq('lot_number', lotNumber)
  }

  const { data: movements, error } = await query

  if (error) {
    return { data: null, error: error.message }
  }

  if (!movements || movements.length === 0) {
    return { data: [], error: null }
  }

  // Fetch related document details for each movement
  const enrichedMovements: StockMovementWithDetails[] = await Promise.all(
    movements.map(async (movement) => {
      const enriched: StockMovementWithDetails = { ...movement } as StockMovementWithDetails

      if (!movement.reference_type || !movement.reference_id) {
        return enriched
      }

      try {
        switch (movement.reference_type) {
          case 'po': {
            const { data: po } = await supabase
              .from('purchase_orders')
              .select('po_number, supplier:suppliers(name)')
              .eq('id', movement.reference_id)
              .single()
            if (po) {
              enriched.document_number = po.po_number
              enriched.partner_name = (po.supplier as unknown as { name: string } | null)?.name
            }
            break
          }
          case 'shipment': {
            const { data: shipment } = await supabase
              .from('shipments')
              .select('shipment_number, customer_name, customer:customers(name)')
              .eq('id', movement.reference_id)
              .single()
            if (shipment) {
              enriched.document_number = shipment.shipment_number
              enriched.partner_name = (shipment.customer as unknown as { name: string } | null)?.name || shipment.customer_name
            }
            break
          }
          case 'transfer': {
            const { data: transfer } = await supabase
              .from('transfers')
              .select('transfer_number, from_location:locations!transfers_from_location_id_fkey(name), to_location:locations!transfers_to_location_id_fkey(name)')
              .eq('id', movement.reference_id)
              .single()
            if (transfer) {
              enriched.document_number = transfer.transfer_number
              enriched.from_location_name = (transfer.from_location as unknown as { name: string } | null)?.name
              enriched.to_location_name = (transfer.to_location as unknown as { name: string } | null)?.name
            }
            break
          }
          case 'adjustment': {
            const { data: adjustment } = await supabase
              .from('adjustments')
              .select('adjustment_number, reason')
              .eq('id', movement.reference_id)
              .single()
            if (adjustment) {
              enriched.document_number = adjustment.adjustment_number
            }
            break
          }
          case 'cycle_count': {
            const { data: count } = await supabase
              .from('cycle_counts')
              .select('count_number')
              .eq('id', movement.reference_id)
              .single()
            if (count) {
              enriched.document_number = count.count_number
            }
            break
          }
          case 'return': {
            const { data: returnDoc } = await supabase
              .from('returns')
              .select('return_number, return_type, partner_name')
              .eq('id', movement.reference_id)
              .single()
            if (returnDoc) {
              enriched.document_number = returnDoc.return_number
              enriched.partner_name = returnDoc.partner_name
            }
            break
          }
        }
      } catch {
        // Ignore errors for individual document lookups
      }

      return enriched
    })
  )

  return { data: enrichedMovements, error: null }
}

export async function getDepletedStock() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { data: null, error: 'User not found' }

  // Get inventory balances where qty_on_hand = 0
  // These are stock items that were once in stock but are now depleted
  const { data, error } = await supabase
    .from('inventory_balances')
    .select(`
      *,
      product:products(id, sku, name, base_uom, reorder_point, current_cost, category:categories(name)),
      location:locations(id, name)
    `)
    .eq('tenant_id', userData.tenant_id)
    .eq('qty_on_hand', 0)
    .order('updated_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
