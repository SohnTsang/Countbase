import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatCurrency } from '@/lib/utils'
import { TransferActions } from '@/components/transfers/transfer-actions'

interface TransferDetailPageProps {
  params: Promise<{ id: string }>
}

const STATUS_COLORS = {
  draft: 'secondary',
  confirmed: 'default',
  completed: 'default',
  cancelled: 'destructive',
} as const

export default async function TransferDetailPage({ params }: TransferDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: transfer, error } = await supabase
    .from('transfers')
    .select(`
      *,
      from_location:locations!transfers_from_location_id_fkey(id, name),
      to_location:locations!transfers_to_location_id_fkey(id, name),
      lines:transfer_lines(
        *,
        product:products(id, sku, name, base_uom)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !transfer) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Transfer {transfer.transfer_number}
          </h1>
          <p className="text-gray-600">
            {transfer.from_location?.name} → {transfer.to_location?.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={STATUS_COLORS[transfer.status as keyof typeof STATUS_COLORS] || 'secondary'}>
            {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
          </Badge>
          <TransferActions transfer={transfer} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">From Location:</span>
              <span className="font-medium">{transfer.from_location?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">To Location:</span>
              <span className="font-medium">{transfer.to_location?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created:</span>
              <span className="font-medium">{formatDate(transfer.created_at)}</span>
            </div>
            {transfer.sent_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Sent:</span>
                <span className="font-medium">{formatDate(transfer.sent_at)}</span>
              </div>
            )}
            {transfer.received_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Received:</span>
                <span className="font-medium">{formatDate(transfer.received_at)}</span>
              </div>
            )}
            {transfer.notes && (
              <div className="pt-2">
                <span className="text-gray-500">Notes:</span>
                <p className="mt-1">{transfer.notes}</p>
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
            {transfer.lines?.map((line: any) => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono">{line.product?.sku}</TableCell>
                  <TableCell>{line.product?.name}</TableCell>
                  <TableCell>{line.lot_number || '-'}</TableCell>
                  <TableCell>{line.expiry_date ? formatDate(line.expiry_date) : '-'}</TableCell>
                  <TableCell className="text-right">
                    {line.qty} {line.product?.base_uom}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.unit_cost ? formatCurrency(line.unit_cost) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.unit_cost ? formatCurrency(line.qty * line.unit_cost) : '-'}
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
