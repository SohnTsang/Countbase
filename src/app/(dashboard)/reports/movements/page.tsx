import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MovementsExport } from './movements-export'
import { MovementsClient, type MovementData } from './movements-client'
import { getTranslator } from '@/lib/i18n/server'

async function enrichMovementsWithDocuments(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movements: any[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<MovementData[]> {
  // Get unique reference IDs by type
  const refsByType = new Map<string, Set<string>>()
  movements.forEach((m) => {
    if (m.reference_type && m.reference_id) {
      if (!refsByType.has(m.reference_type)) {
        refsByType.set(m.reference_type, new Set())
      }
      refsByType.get(m.reference_type)!.add(m.reference_id)
    }
  })

  // Fetch document numbers for each type
  const docMaps = new Map<string, Map<string, { number: string; from_location?: string; to_location?: string }>>()

  const fetchPromises: Promise<void>[] = []

  if (refsByType.has('po')) {
    const ids = Array.from(refsByType.get('po')!)
    fetchPromises.push(
      (async () => {
        const { data } = await supabase
          .from('purchase_orders')
          .select('id, po_number')
          .in('id', ids)
        const map = new Map<string, { number: string }>()
        data?.forEach((d) => map.set(d.id, { number: d.po_number }))
        docMaps.set('po', map)
      })()
    )
  }

  if (refsByType.has('shipment')) {
    const ids = Array.from(refsByType.get('shipment')!)
    fetchPromises.push(
      (async () => {
        const { data } = await supabase
          .from('shipments')
          .select('id, shipment_number')
          .in('id', ids)
        const map = new Map<string, { number: string }>()
        data?.forEach((d) => map.set(d.id, { number: d.shipment_number }))
        docMaps.set('shipment', map)
      })()
    )
  }

  if (refsByType.has('transfer')) {
    const ids = Array.from(refsByType.get('transfer')!)
    fetchPromises.push(
      (async () => {
        const { data } = await supabase
          .from('transfers')
          .select('id, transfer_number, from_location:locations!transfers_from_location_id_fkey(name), to_location:locations!transfers_to_location_id_fkey(name)')
          .in('id', ids)
        const map = new Map<string, { number: string; from_location?: string; to_location?: string }>()
        data?.forEach((d) => {
          map.set(d.id, {
            number: d.transfer_number,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            from_location: (d.from_location as any)?.name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            to_location: (d.to_location as any)?.name,
          })
        })
        docMaps.set('transfer', map)
      })()
    )
  }

  if (refsByType.has('adjustment')) {
    const ids = Array.from(refsByType.get('adjustment')!)
    fetchPromises.push(
      (async () => {
        const { data } = await supabase
          .from('adjustments')
          .select('id, adjustment_number')
          .in('id', ids)
        const map = new Map<string, { number: string }>()
        data?.forEach((d) => map.set(d.id, { number: d.adjustment_number }))
        docMaps.set('adjustment', map)
      })()
    )
  }

  if (refsByType.has('cycle_count')) {
    const ids = Array.from(refsByType.get('cycle_count')!)
    fetchPromises.push(
      (async () => {
        const { data } = await supabase
          .from('cycle_counts')
          .select('id, count_number')
          .in('id', ids)
        const map = new Map<string, { number: string }>()
        data?.forEach((d) => map.set(d.id, { number: d.count_number }))
        docMaps.set('cycle_count', map)
      })()
    )
  }

  if (refsByType.has('return')) {
    const ids = Array.from(refsByType.get('return')!)
    fetchPromises.push(
      (async () => {
        const { data } = await supabase
          .from('returns')
          .select('id, return_number')
          .in('id', ids)
        const map = new Map<string, { number: string }>()
        data?.forEach((d) => map.set(d.id, { number: d.return_number }))
        docMaps.set('return', map)
      })()
    )
  }

  await Promise.all(fetchPromises)

  // Enrich movements with document numbers and locations
  return movements.map((m) => {
    const docInfo = m.reference_type && m.reference_id
      ? docMaps.get(m.reference_type)?.get(m.reference_id)
      : null

    return {
      ...m,
      document_number: docInfo?.number || null,
      from_location_name: docInfo?.from_location || null,
      to_location_name: docInfo?.to_location || null,
    }
  })
}

export default async function MovementsReportPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: movements } = await supabase
    .from('stock_movements')
    .select(`
      id,
      created_at,
      movement_type,
      qty,
      unit_cost,
      lot_number,
      expiry_date,
      reason,
      notes,
      reference_type,
      reference_id,
      product:products(id, sku, name, base_uom),
      location:locations(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('active', true)
    .order('name')

  // Enrich movements with document numbers
  const enrichedMovements = movements
    ? await enrichMovementsWithDocuments(movements, supabase)
    : []

  // Prepare export data with all fields
  const exportData = enrichedMovements.map((m) => ({
    date: m.created_at,
    type: m.movement_type,
    sku: m.product?.sku || '',
    product: m.product?.name || '',
    location: m.location?.name || '',
    from_location: m.from_location_name || '',
    to_location: m.to_location_name || '',
    qty: m.qty,
    uom: m.product?.base_uom || '',
    unit_cost: m.unit_cost || 0,
    extended_cost: Math.abs(m.qty * (m.unit_cost || 0)),
    lot_number: m.lot_number || '',
    expiry_date: m.expiry_date || '',
    reason: m.reason || '',
    notes: m.notes || '',
    document_number: m.document_number || '',
    reference: m.reference_type ? `${m.reference_type}/${m.reference_id}` : '',
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('reports.movements')}</h1>
            <p className="text-gray-600">{t('reports.recentMovements')}</p>
          </div>
        </div>
        <MovementsExport data={exportData} />
      </div>

      <MovementsClient
        data={enrichedMovements}
        locations={locations || []}
      />
    </div>
  )
}
