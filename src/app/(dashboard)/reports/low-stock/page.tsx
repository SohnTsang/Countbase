import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LowStockExport } from './low-stock-export'
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
      active
    `)
    .eq('active', true)
    .gt('reorder_point', 0)
    .order('sku')

  // Get inventory balances
  const { data: balances } = await supabase
    .from('inventory_balances')
    .select('product_id, qty_on_hand')

  // Calculate total on hand for each product
  const stockByProduct = new Map<string, number>()
  balances?.forEach((b) => {
    const current = stockByProduct.get(b.product_id) || 0
    stockByProduct.set(b.product_id, current + b.qty_on_hand)
  })

  // Filter products that are below reorder point
  const lowStock = products
    ?.map((p) => ({
      ...p,
      total_on_hand: stockByProduct.get(p.id) || 0,
    }))
    .filter((p) => p.total_on_hand < p.reorder_point)
    .sort((a, b) => a.total_on_hand - b.total_on_hand)

  // Prepare export data
  const exportData = lowStock?.map((item) => ({
    sku: item.sku,
    product: item.name,
    uom: item.base_uom,
    on_hand: item.total_on_hand,
    reorder_point: item.reorder_point,
    reorder_qty: item.reorder_qty,
    shortage: item.reorder_point - item.total_on_hand,
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
            <h1 className="text-2xl font-bold text-gray-900">{t('reports.lowStock')}</h1>
            <p className="text-gray-600">{t('reports.lowStockDesc')}</p>
          </div>
        </div>
        <LowStockExport data={exportData} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{`${lowStock?.length || 0} ${t('reports.productsNeedReordering')}`}</CardTitle>
        </CardHeader>
        <CardContent>
          {lowStock && lowStock.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('products.sku')}</TableHead>
                  <TableHead>{t('products.product')}</TableHead>
                  <TableHead>{t('reports.unit')}</TableHead>
                  <TableHead className="text-right">{t('reports.onHand')}</TableHead>
                  <TableHead className="text-right">{t('products.reorderPoint')}</TableHead>
                  <TableHead className="text-right">{t('products.reorderQty')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.base_uom}</TableCell>
                    <TableCell className="text-right">{item.total_on_hand}</TableCell>
                    <TableCell className="text-right">{item.reorder_point}</TableCell>
                    <TableCell className="text-right">{item.reorder_qty}</TableCell>
                    <TableCell>
                      <Badge variant={item.total_on_hand === 0 ? 'destructive' : 'default'}>
                        {item.total_on_hand === 0
                          ? t('reports.outOfStock')
                          : `${t('reports.short')} ${item.reorder_point - item.total_on_hand}`}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-gray-500 py-8">
              {t('reports.allProductsAboveReorderPoint')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
