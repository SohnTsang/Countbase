import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency } from '@/lib/utils'
import { MovementsExport } from './movements-export'
import { getTranslator } from '@/lib/i18n/server'

export default async function MovementsReportPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const MOVEMENT_LABELS: Record<string, string> = {
    receive: t('movementTypes.receive'),
    ship: t('movementTypes.ship'),
    transfer_out: t('movementTypes.transfer_out'),
    transfer_in: t('movementTypes.transfer_in'),
    adjustment: t('movementTypes.adjustment'),
    count_variance: t('movementTypes.count_variance'),
    return_in: t('movementTypes.return_in'),
    return_out: t('movementTypes.return_out'),
    void: t('movementTypes.void'),
  }

  const { data: movements } = await supabase
    .from('stock_movements')
    .select(`
      *,
      product:products(id, sku, name, base_uom),
      location:locations(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  // Flatten data for export
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exportData = movements?.map((m: any) => ({
    date: m.created_at,
    type: m.movement_type,
    sku: m.product?.sku || '',
    product: m.product?.name || '',
    location: m.location?.name || '',
    qty: m.qty,
    uom: m.product?.base_uom || '',
    unit_cost: m.unit_cost || 0,
    reference: m.reference_type ? `${m.reference_type}/${m.reference_id?.slice(0, 8) || ''}` : '',
  })) || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('reports.movements')}</h1>
            <p className="text-gray-600">{t('reports.recentMovements')}</p>
          </div>
        </div>
        <MovementsExport data={exportData} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.movementHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {movements && movements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('locations.type')}</TableHead>
                  <TableHead>{t('products.sku')}</TableHead>
                  <TableHead>{t('products.product')}</TableHead>
                  <TableHead>{t('stock.location')}</TableHead>
                  <TableHead className="text-right">{t('common.quantity')}</TableHead>
                  <TableHead className="text-right">{t('reports.cost')}</TableHead>
                  <TableHead>{t('reports.reference')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {movements.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatDate(m.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{m.product?.sku}</TableCell>
                    <TableCell>{m.product?.name}</TableCell>
                    <TableCell>{m.location?.name}</TableCell>
                    <TableCell className="text-right">
                      <span className={m.qty > 0 ? 'text-green-600' : 'text-red-600'}>
                        {m.qty > 0 ? '+' : ''}{m.qty} {m.product?.base_uom}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {m.unit_cost ? formatCurrency(m.unit_cost) : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {m.reference_type && m.reference_id
                        ? `${m.reference_type}/${m.reference_id.slice(0, 8)}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-gray-500 py-8">{t('reports.noMovements')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
