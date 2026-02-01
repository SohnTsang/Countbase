import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { ValuationExport } from './valuation-export'

export default async function ValuationReportPage() {
  const supabase = await createClient()

  const { data: balances } = await supabase
    .from('inventory_balances')
    .select(`
      id,
      qty_on_hand,
      avg_cost,
      inventory_value,
      product:products(id, sku, name, base_uom),
      location:locations(id, name)
    `)
    .gt('qty_on_hand', 0)
    .order('inventory_value', { ascending: false })

  // Calculate totals
  const totalValue = balances?.reduce((sum, b) => sum + (b.inventory_value || 0), 0) || 0
  const totalItems = balances?.reduce((sum, b) => sum + (b.qty_on_hand || 0), 0) || 0

  // Prepare export data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exportData = balances?.map((b: any) => ({
    sku: b.product?.sku || '',
    product: b.product?.name || '',
    location: b.location?.name || '',
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
            <h1 className="text-2xl font-bold text-gray-900">Inventory Valuation</h1>
            <p className="text-gray-600">Current value by product and location</p>
          </div>
        </div>
        <ValuationExport data={exportData} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalItems.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory by Product & Location</CardTitle>
        </CardHeader>
        <CardContent>
          {balances && balances.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {balances.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono">{b.product?.sku}</TableCell>
                    <TableCell>{b.product?.name}</TableCell>
                    <TableCell>{b.location?.name}</TableCell>
                    <TableCell className="text-right">
                      {b.qty_on_hand} {b.product?.base_uom}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(b.avg_cost)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(b.inventory_value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-gray-500 py-8">No inventory found</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
