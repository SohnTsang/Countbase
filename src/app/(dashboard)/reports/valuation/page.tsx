import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ValuationExport } from './valuation-export'
import { ValuationClient, type ValuationData } from './valuation-client'
import { getTranslator } from '@/lib/i18n/server'

export default async function ValuationReportPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  // Use calculated stock (from stock_movements) as source of truth
  const { data: balances } = await supabase.rpc('get_calculated_stock')

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('active', true)
    .order('name')

  // Get categories for chart grouping and filtering
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('active', true)
    .order('name')

  // Prepare table data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableData: ValuationData[] = balances?.map((b: any, index: number) => ({
    id: `${b.product_id}-${b.location_id}-${index}`,
    product_id: b.product_id,
    location_id: b.location_id,
    qty_on_hand: b.qty_on_hand,
    avg_cost: b.avg_cost,
    inventory_value: b.inventory_value,
    lot_number: b.lot_number,
    expiry_date: b.expiry_date,
    product: b.product,
    location: b.location,
  })) || []

  // Prepare export data with all fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exportData = balances?.map((b: any) => ({
    sku: b.product?.sku || '',
    product: b.product?.name || '',
    location: b.location?.name || '',
    lot_number: b.lot_number || '',
    expiry_date: b.expiry_date || '',
    qty: b.qty_on_hand,
    uom: b.product?.base_uom || '',
    avg_cost: b.avg_cost || 0,
    total_value: b.inventory_value || 0,
  })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('reports.valuation')}</h1>
            <p className="text-gray-600">{t('reports.valuationDesc')}</p>
          </div>
        </div>
        <ValuationExport data={exportData} />
      </div>

      <ValuationClient
        data={tableData}
        locations={locations || []}
        categories={categories || []}
      />
    </div>
  )
}
