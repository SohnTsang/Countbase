import { createClient } from '@/lib/supabase/server'
import { TransferForm } from '@/components/forms/transfer-form'

export default async function NewTransferPage() {
  const supabase = await createClient()

  const [locationsResult, productsResult] = await Promise.all([
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Transfer</h1>
        <p className="text-gray-600">Move inventory between locations</p>
      </div>
      <TransferForm
        locations={locationsResult.data || []}
        products={productsResult.data || []}
      />
    </div>
  )
}
