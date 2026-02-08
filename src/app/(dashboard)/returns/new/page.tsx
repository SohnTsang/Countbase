export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ReturnForm } from '@/components/forms/return-form'
import { getTranslator } from '@/lib/i18n/server'

export default async function NewReturnPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const [customersRes, suppliersRes, locationsRes, productsRes, balancesRes] = await Promise.all([
    supabase.from('customers').select('*').eq('active', true).order('name'),
    supabase.from('suppliers').select('*').eq('active', true).order('name'),
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
    supabase.from('calculated_stock').select('*'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/returns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('returns.newReturn')}</h1>
          <p className="text-gray-600">{t('returns.newReturnSubtitle')}</p>
        </div>
      </div>

      <ReturnForm
        customers={customersRes.data || []}
        suppliers={suppliersRes.data || []}
        locations={locationsRes.data || []}
        products={productsRes.data || []}
        stockBalances={balancesRes.data || []}
      />
    </div>
  )
}
