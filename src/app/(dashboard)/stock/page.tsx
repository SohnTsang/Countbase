import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StockTable } from '@/components/tables/stock-table'
import { formatCurrency } from '@/lib/utils'
import { Package, MapPin, DollarSign, AlertTriangle } from 'lucide-react'
import { getTranslator } from '@/lib/i18n/server'

export default async function StockPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  // Fetch inventory balances with product and location info
  const { data: balances, error } = await supabase
    .from('inventory_balances')
    .select(`
      *,
      product:products(id, sku, name, base_uom, reorder_point, track_expiry, track_lot),
      location:locations(id, name, type)
    `)
    .gt('qty_on_hand', 0)
    .order('product_id')

  // Fetch locations for filter
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('active', true)
    .order('name')

  if (error) {
    return <div className="text-red-600">{t('errors.serverError')}: {error.message}</div>
  }

  // Calculate summary stats
  const totalProducts = new Set(balances?.map(b => b.product_id)).size
  const totalLocations = new Set(balances?.map(b => b.location_id)).size
  const totalValue = balances?.reduce((sum, b) => sum + (b.inventory_value || 0), 0) || 0
  const lowStockCount = balances?.filter(b =>
    b.product?.reorder_point && b.qty_on_hand <= b.product.reorder_point
  ).length || 0

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
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
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

      <StockTable data={balances || []} locations={locations || []} />
    </div>
  )
}
