import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, MapPin, AlertTriangle, TrendingUp } from 'lucide-react'
import { getTranslator } from '@/lib/i18n/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  // Get counts
  const [
    { count: productCount },
    { count: locationCount },
    { data: lowStock },
    { data: expiringStock },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('locations').select('*', { count: 'exact', head: true }),
    supabase.from('v_low_stock').select('*'),
    supabase.from('v_expiring_soon').select('*'),
  ])

  const stats = [
    {
      name: t('dashboard.totalProducts'),
      value: productCount || 0,
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      name: t('locations.title'),
      value: locationCount || 0,
      icon: MapPin,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      name: t('dashboard.lowStockItems'),
      value: lowStock?.length || 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      name: t('stock.expiryDate'),
      value: expiringStock?.length || 0,
      icon: TrendingUp,
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <div className={`${stat.bg} ${stat.color} p-2 rounded-md`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alert */}
      {lowStock && lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboard.lowStockItems')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStock.slice(0, 5).map((item: { product_id: string; sku: string; name: string; total_on_hand: number; reorder_point: number }) => (
                <div key={item.product_id} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                  <div>
                    <span className="font-medium">{item.sku}</span>
                    <span className="text-gray-600 ml-2">{item.name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-orange-600 font-medium">{item.total_on_hand}</span>
                    <span className="text-gray-500"> / {item.reorder_point} min</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
