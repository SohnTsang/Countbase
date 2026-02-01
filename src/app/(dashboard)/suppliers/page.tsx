import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { SuppliersTable } from '@/components/tables/suppliers-table'

export default async function SuppliersPage() {
  const supabase = await createClient()

  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name')

  if (error) {
    return <div className="text-red-600">Error: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600">Manage your suppliers and vendors</p>
        </div>
        <Link href="/suppliers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </Link>
      </div>

      <SuppliersTable data={suppliers || []} />
    </div>
  )
}
