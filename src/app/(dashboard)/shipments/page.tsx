import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ShipmentsTable } from '@/components/tables/shipments-table'

export default async function ShipmentsPage() {
  const supabase = await createClient()

  const { data: shipments, error } = await supabase
    .from('shipments')
    .select(`
      *,
      customer:customers(id, name, code),
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
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
          <p className="text-gray-600">Manage outbound shipments to customers</p>
        </div>
        <Link href="/shipments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Shipment
          </Button>
        </Link>
      </div>

      <ShipmentsTable data={shipments || []} />
    </div>
  )
}
