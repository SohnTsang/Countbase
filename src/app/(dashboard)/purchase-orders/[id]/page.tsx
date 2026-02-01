import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PurchaseOrderActions } from '@/components/purchase-order-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: po, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(id, name, code, email, phone),
      location:locations(id, name, type),
      lines:purchase_order_lines(
        id,
        product_id,
        qty_ordered,
        qty_received,
        unit_cost,
        product:products(id, sku, name, base_uom)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !po) {
    notFound()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderTotal = po.lines?.reduce((sum: number, line: any) => {
    return sum + line.qty_ordered * line.unit_cost
  }, 0) || 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const receivedTotal = po.lines?.reduce((sum: number, line: any) => {
    return sum + line.qty_received * line.unit_cost
  }, 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/purchase-orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{po.po_number}</h1>
              <Badge className={statusColors[po.status] || ''}>
                {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
              </Badge>
            </div>
            <p className="text-gray-600">Order Date: {formatDate(po.order_date)}</p>
          </div>
        </div>
        <PurchaseOrderActions po={po} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Supplier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">Name:</span>
              <p className="font-medium">
                {po.supplier?.code && `${po.supplier.code} - `}
                {po.supplier?.name}
              </p>
            </div>
            {po.supplier?.email && (
              <div>
                <span className="text-sm text-gray-500">Email:</span>
                <p>{po.supplier.email}</p>
              </div>
            )}
            {po.supplier?.phone && (
              <div>
                <span className="text-sm text-gray-500">Phone:</span>
                <p>{po.supplier.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">Receive To:</span>
              <p className="font-medium">{po.location?.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Expected Date:</span>
              <p>{po.expected_date ? formatDate(po.expected_date) : '-'}</p>
            </div>
            {po.notes && (
              <div>
                <span className="text-sm text-gray-500">Notes:</span>
                <p>{po.notes}</p>
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {po.lines?.map((line: any) => {
                  const remaining = line.qty_ordered - line.qty_received
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div>
                          <span className="font-mono text-sm">{line.product?.sku}</span>
                          <p className="text-sm text-gray-600">{line.product?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {line.qty_ordered} {line.product?.base_uom}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.qty_received} {line.product?.base_uom}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={remaining > 0 ? 'text-orange-600' : 'text-green-600'}>
                          {remaining} {line.product?.base_uom}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(line.unit_cost)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(line.qty_ordered * line.unit_cost)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col items-end gap-2 mt-4 text-right">
            <div className="text-sm text-gray-500">
              Received Total: {formatCurrency(receivedTotal)}
            </div>
            <div className="text-lg font-bold">
              Order Total: {formatCurrency(orderTotal)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
