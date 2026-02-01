import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { CycleCountForm } from '@/components/forms/cycle-count-form'

export default async function NewCycleCountPage() {
  const supabase = await createClient()

  const [locationsRes, productsRes] = await Promise.all([
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cycle-counts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Cycle Count</h1>
          <p className="text-gray-600">Create a new physical inventory count</p>
        </div>
      </div>

      <CycleCountForm
        locations={locationsRes.data || []}
        products={productsRes.data || []}
      />
    </div>
  )
}
