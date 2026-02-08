import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExpiringExport } from './expiring-export'
import { ExpiringClient, type ExpiringData } from './expiring-client'
import { getTranslator } from '@/lib/i18n/server'

export default async function ExpiringReportPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  // Get calculated stock with expiry dates in next 30 days (source of truth from stock_movements)
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  // First get calculated stock filtered by expiry
  const { data: stockData } = await supabase
    .from('calculated_stock')
    .select('*')
    .not('expiry_date', 'is', null)
    .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
    .order('expiry_date', { ascending: true })

  // Get products and locations for joining
  const productIds = [...new Set(stockData?.map((s) => s.product_id) || [])]
  const locationIds = [...new Set(stockData?.map((s) => s.location_id) || [])]

  const [productsRes, locationsRes] = await Promise.all([
    productIds.length > 0
      ? supabase.from('products').select('id, sku, name, base_uom').in('id', productIds)
      : Promise.resolve({ data: [] }),
    locationIds.length > 0
      ? supabase.from('locations').select('id, name').in('id', locationIds)
      : Promise.resolve({ data: [] }),
  ])

  const productsMap = new Map(productsRes.data?.map((p) => [p.id, p]) || [])
  const locationsMap = new Map(locationsRes.data?.map((l) => [l.id, l]) || [])

  // Get all locations for filter
  const { data: allLocations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('active', true)
    .order('name')

  // Calculate days until expiry
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Join data and calculate days
  const expiringWithDays: ExpiringData[] = (stockData || []).map((s, index) => {
    const expiryDate = new Date(s.expiry_date!)
    expiryDate.setHours(0, 0, 0, 0)
    const diffTime = expiryDate.getTime() - today.getTime()
    const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return {
      id: `${s.product_id}-${s.location_id}-${index}`,
      qty_on_hand: s.qty_on_hand,
      lot_number: s.lot_number,
      expiry_date: s.expiry_date!,
      days_until_expiry: daysUntilExpiry,
      avg_cost: s.avg_cost || 0,
      inventory_value: (s.qty_on_hand || 0) * (s.avg_cost || 0),
      location_id: s.location_id,
      product: productsMap.get(s.product_id) || null,
      location: locationsMap.get(s.location_id) || null,
    }
  })

  // Prepare export data with all fields
  const exportData = expiringWithDays.map((item) => ({
    sku: item.product?.sku || '',
    product: item.product?.name || '',
    location: item.location?.name || '',
    lot_number: item.lot_number || '',
    expiry_date: item.expiry_date || '',
    qty: item.qty_on_hand,
    uom: item.product?.base_uom || '',
    avg_cost: item.avg_cost,
    inventory_value: item.inventory_value,
    days_until_expiry: item.days_until_expiry,
  }))

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
            <h1 className="text-2xl font-bold text-gray-900">{t('reports.expiring')}</h1>
            <p className="text-gray-600">{t('reports.expiringDesc')}</p>
          </div>
        </div>
        <ExpiringExport data={exportData} />
      </div>

      <ExpiringClient
        data={expiringWithDays}
        locations={allLocations || []}
      />
    </div>
  )
}
