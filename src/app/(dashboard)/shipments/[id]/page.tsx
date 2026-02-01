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
import { ShipmentActions } from '@/components/shipment-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default async function ShipmentDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: shipment, error } = await supabase
    .from('shipments')
    .select(`
      *,
      customer:customers(id, name, code, email, phone),
      location:locations(id, name, type),
      lines:shipment_lines(
        id,
        product_id,
        qty,
        lot_number,
        expiry_date,
        unit_cost,
        product:products(id, sku, name, base_uom)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !shipment) {
    notFound()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shipmentTotal = shipment.lines?.reduce((sum: number, line: any) => {
    return sum + line.qty * (line.unit_cost || 0)
  }, 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/shipments">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{shipment.shipment_number}</h1>
              <Badge className={statusColors[shipment.status] || ''}>
                {shipment.status.charAt(0).toUpperCase() + shipment.status.slice(1)}
              </Badge>
            </div>
            <p className="text-gray-600">
              Ship Date: {shipment.ship_date ? formatDate(shipment.ship_date) : 'Not set'}
            </p>
          </div>
        </div>
        <ShipmentActions shipment={shipment} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">Name:</span>
              <p className="font-medium">
                {shipment.customer?.name || shipment.customer_name || '-'}
              </p>
            </div>
            {shipment.customer?.email && (
              <div>
                <span className="text-sm text-gray-500">Email:</span>
                <p>{shipment.customer.email}</p>
              </div>
            )}
            {shipment.customer?.phone && (
              <div>
                <span className="text-sm text-gray-500">Phone:</span>
                <p>{shipment.customer.phone}</p>
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
              <span className="text-sm text-gray-500">Ship From:</span>
              <p className="font-medium">{shipment.location?.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Created:</span>
              <p>{formatDate(shipment.created_at)}</p>
            </div>
            {shipment.notes && (
              <div>
                <span className="text-sm text-gray-500">Notes:</span>
                <p>{shipment.notes}</p>
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
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Lot #</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {shipment.lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div>
                        <span className="font-mono text-sm">{line.product?.sku}</span>
                        <p className="text-sm text-gray-600">{line.product?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {line.qty} {line.product?.base_uom}
                    </TableCell>
                    <TableCell>{line.lot_number || '-'}</TableCell>
                    <TableCell>
                      {line.expiry_date ? formatDate(line.expiry_date) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.unit_cost ? formatCurrency(line.unit_cost) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {line.unit_cost ? formatCurrency(line.qty * line.unit_cost) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {shipment.status === 'completed' && shipmentTotal > 0 && (
            <div className="flex justify-end mt-4">
              <div className="text-lg font-bold">
                Total Value: {formatCurrency(shipmentTotal)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
