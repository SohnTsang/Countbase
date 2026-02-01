import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatCurrency } from '@/lib/utils'
import { AdjustmentActions } from '@/components/adjustments/adjustment-actions'

interface AdjustmentDetailPageProps {
  params: Promise<{ id: string }>
}

const STATUS_COLORS = {
  draft: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
} as const

const REASON_LABELS = {
  damage: 'Damage',
  shrinkage: 'Shrinkage',
  expiry: 'Expiry',
  correction: 'Correction',
  sample: 'Sample',
  count_variance: 'Count Variance',
  other: 'Other',
} as const

export default async function AdjustmentDetailPage({ params }: AdjustmentDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: adjustment, error } = await supabase
    .from('adjustments')
    .select(`
      *,
      location:locations(id, name),
      lines:adjustment_lines(
        *,
        product:products(id, sku, name, base_uom)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !adjustment) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Adjustment {adjustment.adjustment_number}
          </h1>
          <p className="text-gray-600">
            {adjustment.location?.name} - {REASON_LABELS[adjustment.reason as keyof typeof REASON_LABELS]}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={STATUS_COLORS[adjustment.status as keyof typeof STATUS_COLORS] || 'secondary'}>
            {adjustment.status.charAt(0).toUpperCase() + adjustment.status.slice(1)}
          </Badge>
          <AdjustmentActions adjustment={adjustment} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Location:</span>
              <span className="font-medium">{adjustment.location?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reason:</span>
              <span className="font-medium">
                {REASON_LABELS[adjustment.reason as keyof typeof REASON_LABELS]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created:</span>
              <span className="font-medium">{formatDate(adjustment.created_at)}</span>
            </div>
            {adjustment.notes && (
              <div className="pt-2">
                <span className="text-gray-500">Notes:</span>
                <p className="mt-1">{adjustment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Lot #</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {adjustment.lines?.map((line: any) => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono">{line.product?.sku}</TableCell>
                  <TableCell>{line.product?.name}</TableCell>
                  <TableCell>{line.lot_number || '-'}</TableCell>
                  <TableCell>{line.expiry_date ? formatDate(line.expiry_date) : '-'}</TableCell>
                  <TableCell className="text-right">
                    <span className={line.qty > 0 ? 'text-green-600' : 'text-red-600'}>
                      {line.qty > 0 ? '+' : ''}{line.qty} {line.product?.base_uom}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {line.unit_cost ? formatCurrency(line.unit_cost) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.unit_cost ? formatCurrency(Math.abs(line.qty * line.unit_cost)) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
