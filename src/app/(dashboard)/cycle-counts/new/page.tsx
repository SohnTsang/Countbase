export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { CycleCountForm } from '@/components/forms/cycle-count-form'
import { getTranslator } from '@/lib/i18n/server'

export default async function NewCycleCountPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const [locationsRes, productsRes, balancesRes] = await Promise.all([
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
    supabase.from('calculated_stock').select('*'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cycle-counts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('cycleCounts.newCycleCount')}</h1>
          <p className="text-gray-600">{t('cycleCounts.newCycleCountSubtitle')}</p>
        </div>
      </div>

      <CycleCountForm
        locations={locationsRes.data || []}
        products={productsRes.data || []}
        stockBalances={balancesRes.data || []}
      />
    </div>
  )
}
