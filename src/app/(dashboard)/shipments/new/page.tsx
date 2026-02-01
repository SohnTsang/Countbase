import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ShipmentForm } from '@/components/forms/shipment-form'

export default async function NewShipmentPage() {
  const supabase = await createClient()

  const [customersRes, locationsRes, productsRes, balancesRes] = await Promise.all([
    supabase.from('customers').select('*').eq('active', true).order('name'),
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
    supabase.from('inventory_balances').select('*').gt('qty_on_hand', 0),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/shipments">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Shipment</h1>
          <p className="text-gray-600">Create a new outbound shipment</p>
        </div>
      </div>

      <ShipmentForm
        customers={customersRes.data || []}
        locations={locationsRes.data || []}
        products={productsRes.data || []}
        stockBalances={balancesRes.data || []}
      />
    </div>
  )
}
