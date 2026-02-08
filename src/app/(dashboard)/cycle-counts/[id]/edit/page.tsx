export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { CycleCountForm } from '@/components/forms/cycle-count-form'
import { getTranslator } from '@/lib/i18n/server'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCycleCountPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: cycleCount, error } = await supabase
    .from('cycle_counts')
    .select(`
      *,
      lines:cycle_count_lines(
        id,
        product_id,
        lot_number,
        expiry_date
      )
    `)
    .eq('id', id)
    .single()

  if (error || !cycleCount || cycleCount.status !== 'draft') {
    notFound()
  }

  const [locationsRes, productsRes, balancesRes] = await Promise.all([
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
    supabase.from('calculated_stock').select('*'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/cycle-counts/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('cycleCounts.editCount')}</h1>
          <p className="text-gray-600">{cycleCount.count_number}</p>
        </div>
      </div>

      <CycleCountForm
        locations={locationsRes.data || []}
        products={productsRes.data || []}
        stockBalances={balancesRes.data || []}
        initialData={{
          id: cycleCount.id,
          location_id: cycleCount.location_id,
          count_date: cycleCount.count_date,
          notes: cycleCount.notes,
          lines: cycleCount.lines || [],
        }}
      />
    </div>
  )
}
