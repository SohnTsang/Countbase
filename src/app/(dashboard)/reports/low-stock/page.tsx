import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LowStockExport } from './low-stock-export'
import { LowStockClient, type LowStockData } from './low-stock-client'
import { getTranslator } from '@/lib/i18n/server'

export default async function LowStockReportPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  // Get products with their total stock across all locations
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      sku,
      name,
      base_uom,
      reorder_point,
      reorder_qty,
      current_cost,
      category_id,
      category:categories(name),
      active
    `)
    .eq('active', true)
    .gt('reorder_point', 0)
    .order('sku')

  // Get categories for filter
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('active', true)
    .order('name')

  // Get calculated stock (from stock_movements) as source of truth
  const { data: balances } = await supabase
    .from('calculated_stock')
    .select('product_id, qty_on_hand')

  // Calculate total on hand for each product
  const stockByProduct = new Map<string, number>()
  balances?.forEach((b) => {
    const current = stockByProduct.get(b.product_id) || 0
    stockByProduct.set(b.product_id, current + b.qty_on_hand)
  })

  // Filter products that are below reorder point
  const lowStock: LowStockData[] = (products || [])
    .map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      base_uom: p.base_uom,
      reorder_point: p.reorder_point,
      reorder_qty: p.reorder_qty,
      current_cost: p.current_cost,
      category_id: p.category_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      category_name: (p.category as any)?.name || null,
      total_on_hand: stockByProduct.get(p.id) || 0,
    }))
    .filter((p) => p.total_on_hand < p.reorder_point)
    .sort((a, b) => a.total_on_hand - b.total_on_hand)

  // Prepare export data with all fields
  const exportData = lowStock.map((item) => ({
    sku: item.sku,
    product: item.name,
    category: item.category_name || '',
    uom: item.base_uom,
    on_hand: item.total_on_hand,
    reorder_point: item.reorder_point,
    reorder_qty: item.reorder_qty,
    shortage: item.reorder_point - item.total_on_hand,
    current_cost: item.current_cost,
    shortage_value: (item.reorder_point - item.total_on_hand) * item.current_cost,
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
            <h1 className="text-2xl font-bold text-gray-900">{t('reports.lowStock')}</h1>
            <p className="text-gray-600">{t('reports.lowStockDesc')}</p>
          </div>
        </div>
        <LowStockExport data={exportData} />
      </div>

      <LowStockClient
        data={lowStock}
        categories={categories || []}
      />
    </div>
  )
}
