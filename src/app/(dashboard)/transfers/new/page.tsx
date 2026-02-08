export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TransferForm } from '@/components/forms/transfer-form'
import { getTranslator } from '@/lib/i18n/server'

export default async function NewTransferPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const [locationsResult, productsResult, balancesResult] = await Promise.all([
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
    supabase.from('calculated_stock').select('*'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/transfers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('transfers.newTransfer')}</h1>
          <p className="text-gray-600">{t('transfers.newTransferSubtitle')}</p>
        </div>
      </div>
      <TransferForm
        locations={locationsResult.data || []}
        products={productsResult.data || []}
        stockBalances={balancesResult.data || []}
      />
    </div>
  )
}
