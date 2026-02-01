import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { PurchaseOrdersTable } from '@/components/tables/purchase-orders-table'

export default async function PurchaseOrdersPage() {
  const supabase = await createClient()

  const { data: purchaseOrders, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(id, name, code),
      location:locations(id, name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-red-600">Error: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600">Manage inbound orders from suppliers</p>
        </div>
        <Link href="/purchase-orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New PO
          </Button>
        </Link>
      </div>

      <PurchaseOrdersTable data={purchaseOrders || []} />
    </div>
  )
}
