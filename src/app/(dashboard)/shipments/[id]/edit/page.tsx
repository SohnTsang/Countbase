export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ShipmentForm } from '@/components/forms/shipment-form'
import { getTranslator } from '@/lib/i18n/server'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditShipmentPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: shipment, error } = await supabase
    .from('shipments')
    .select(`
      *,
      lines:shipment_lines(
        id,
        product_id,
        qty,
        lot_number,
        expiry_date
      )
    `)
    .eq('id', id)
    .single()

  if (error || !shipment || shipment.status !== 'draft') {
    notFound()
  }

  const [customersRes, locationsRes, productsRes, balancesRes] = await Promise.all([
    supabase.from('customers').select('*').eq('active', true).order('name'),
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
    supabase.from('calculated_stock').select('*'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/shipments/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('shipments.editShipment')}</h1>
          <p className="text-gray-600">{shipment.shipment_number}</p>
        </div>
      </div>

      <ShipmentForm
        customers={customersRes.data || []}
        locations={locationsRes.data || []}
        products={productsRes.data || []}
        stockBalances={balancesRes.data || []}
        initialData={{
          id: shipment.id,
          location_id: shipment.location_id,
          customer_id: shipment.customer_id,
          customer_name: shipment.customer_name,
          ship_date: shipment.ship_date,
          notes: shipment.notes,
          lines: shipment.lines || [],
        }}
      />
    </div>
  )
}
