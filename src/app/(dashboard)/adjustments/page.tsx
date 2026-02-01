import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AdjustmentsTable } from '@/components/tables/adjustments-table'

export default async function AdjustmentsPage() {
  const supabase = await createClient()

  const { data: adjustments, error } = await supabase
    .from('adjustments')
    .select(`
      *,
      location:locations(id, name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-red-600">Error: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adjustments</h1>
          <p className="text-gray-600">Adjust inventory for damages, shrinkage, corrections</p>
        </div>
        <Link href="/adjustments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Adjustment
          </Button>
        </Link>
      </div>

      <AdjustmentsTable data={adjustments || []} />
    </div>
  )
}
