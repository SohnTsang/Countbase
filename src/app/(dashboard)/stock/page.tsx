export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StockTable } from '@/components/tables/stock-table'
import { formatCurrency } from '@/lib/utils'
import { Package, MapPin, DollarSign, AlertTriangle } from 'lucide-react'
import { getTranslator, getLocale } from '@/lib/i18n/server'
import type { InventoryBalance } from '@/types'

export default async function StockPage() {
  const supabase = await createClient()
  const t = await getTranslator()
  const locale = await getLocale()

  // Get current user's tenant settings for currency
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('tenant:tenants(settings)')
    .eq('id', user?.id)
    .single()

  const currency = (userData?.tenant as { settings?: { default_currency?: string } })?.settings?.default_currency || 'USD'

  // Fetch calculated stock from stock_movements (source of truth)
  const { data: currentStock, error } = await supabase
    .rpc('get_calculated_stock') as { data: InventoryBalance[] | null; error: Error | null }

  // Fetch historical/depleted stock (qty = 0)
  const { data: depletedStock } = await supabase
    .rpc('get_historical_stock') as { data: InventoryBalance[] | null; error: Error | null }

  // Fetch locations for filter
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('active', true)
    .order('name')

  if (error) {
    return <div className="text-red-600">{t('errors.serverError')}: {error.message}</div>
  }

  // Calculate summary stats (only from current stock)
  const stockData = currentStock || []
  const totalProducts = new Set(stockData.map((b: InventoryBalance) => b.product_id)).size
  const totalLocations = new Set(stockData.map((b: InventoryBalance) => b.location_id)).size
  const totalValue = stockData.reduce((sum: number, b: InventoryBalance) => sum + (b.inventory_value || 0), 0)
  const lowStockCount = stockData.filter((b: InventoryBalance) =>
    b.product?.reorder_point && b.qty_on_hand <= b.product.reorder_point
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('stock.title')}</h1>
        <p className="text-gray-600">{t('stock.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalProducts')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('locations.title')}</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLocations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stock.inventoryValue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue, currency, locale)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.lowStockItems')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
          </CardContent>
        </Card>
      </div>

      <StockTable data={stockData} depletedData={depletedStock || []} locations={locations || []} currency={currency} />
    </div>
  )
}
