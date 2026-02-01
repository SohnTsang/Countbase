import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { PurchaseOrderForm } from '@/components/forms/purchase-order-form'

export default async function NewPurchaseOrderPage() {
  const supabase = await createClient()

  const [suppliersRes, locationsRes, productsRes] = await Promise.all([
    supabase.from('suppliers').select('*').eq('active', true).order('name'),
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchase-orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Purchase Order</h1>
          <p className="text-gray-600">Create a new order for a supplier</p>
        </div>
      </div>

      <PurchaseOrderForm
        suppliers={suppliersRes.data || []}
        locations={locationsRes.data || []}
        products={productsRes.data || []}
      />
    </div>
  )
}
