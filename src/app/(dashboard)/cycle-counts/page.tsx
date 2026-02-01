import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CycleCountsTable } from '@/components/tables/cycle-counts-table'

export default async function CycleCountsPage() {
  const supabase = await createClient()

  const { data: cycleCounts, error } = await supabase
    .from('cycle_counts')
    .select(`
      *,
      location:locations(id, name),
      lines:cycle_count_lines(id)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-red-600">Error: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cycle Counts</h1>
          <p className="text-gray-600">Physical inventory counts and variance reconciliation</p>
        </div>
        <Link href="/cycle-counts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Count
          </Button>
        </Link>
      </div>

      <CycleCountsTable data={cycleCounts || []} />
    </div>
  )
}
