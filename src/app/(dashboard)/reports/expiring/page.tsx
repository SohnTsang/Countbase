import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { ExpiringExport } from './expiring-export'

export default async function ExpiringReportPage() {
  const supabase = await createClient()

  // Get inventory balances with expiry dates in next 30 days
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const { data: expiring } = await supabase
    .from('inventory_balances')
    .select(`
      id,
      qty_on_hand,
      lot_number,
      expiry_date,
      product:products(id, sku, name, base_uom),
      location:locations(id, name)
    `)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
    .gt('qty_on_hand', 0)
    .order('expiry_date', { ascending: true })

  // Calculate days until expiry
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiringWithDays = expiring?.map((item) => {
    const expiryDate = new Date(item.expiry_date!)
    expiryDate.setHours(0, 0, 0, 0)
    const diffTime = expiryDate.getTime() - today.getTime()
    const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return { ...item, days_until_expiry: daysUntilExpiry }
  })

  // Prepare export data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exportData = expiringWithDays?.map((item: any) => ({
    sku: item.product?.sku || '',
    product: item.product?.name || '',
    location: item.location?.name || '',
    lot_number: item.lot_number || '',
    expiry_date: item.expiry_date || '',
    qty: item.qty_on_hand,
    uom: item.product?.base_uom || '',
    days_until_expiry: item.days_until_expiry,
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
            <h1 className="text-2xl font-bold text-gray-900">Expiring Soon</h1>
            <p className="text-gray-600">Products expiring in the next 30 days</p>
          </div>
        </div>
        <ExpiringExport data={exportData} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{expiringWithDays?.length || 0} Item(s) Expiring Soon</CardTitle>
        </CardHeader>
        <CardContent>
          {expiringWithDays && expiringWithDays.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Lot #</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Days Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {expiringWithDays.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.product?.sku}</TableCell>
                    <TableCell>{item.product?.name}</TableCell>
                    <TableCell>{item.location?.name}</TableCell>
                    <TableCell>{item.lot_number || '-'}</TableCell>
                    <TableCell>{formatDate(item.expiry_date)}</TableCell>
                    <TableCell className="text-right">
                      {item.qty_on_hand} {item.product?.base_uom}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.days_until_expiry <= 7 ? 'destructive' : 'default'}>
                        {item.days_until_expiry <= 0 ? 'Expired' : `${item.days_until_expiry}d`}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No products expiring in the next 30 days
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
