import { createClient } from '@/lib/supabase/server'
import { AdjustmentForm } from '@/components/forms/adjustment-form'

export default async function NewAdjustmentPage() {
  const supabase = await createClient()

  const [locationsResult, productsResult] = await Promise.all([
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Adjustment</h1>
        <p className="text-gray-600">Adjust inventory for damages, shrinkage, corrections</p>
      </div>
      <AdjustmentForm
        locations={locationsResult.data || []}
        products={productsResult.data || []}
      />
    </div>
  )
}
