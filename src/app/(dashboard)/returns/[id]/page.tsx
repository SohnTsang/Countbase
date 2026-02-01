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
import { ReturnActions } from '@/components/return-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const typeColors: Record<string, string> = {
  customer: 'bg-blue-100 text-blue-800',
  supplier: 'bg-purple-100 text-purple-800',
}

export default async function ReturnDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: returnDoc, error } = await supabase
    .from('returns')
    .select(`
      *,
      location:locations(id, name, type),
      lines:return_lines(
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

  if (error || !returnDoc) {
    notFound()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const returnTotal = returnDoc.lines?.reduce((sum: number, line: any) => {
    return sum + line.qty * (line.unit_cost || 0)
  }, 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/returns">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{returnDoc.return_number}</h1>
              <Badge className={typeColors[returnDoc.return_type] || ''}>
                {returnDoc.return_type === 'customer' ? 'From Customer' : 'To Supplier'}
              </Badge>
              <Badge className={statusColors[returnDoc.status] || ''}>
                {returnDoc.status.charAt(0).toUpperCase() + returnDoc.status.slice(1)}
              </Badge>
            </div>
            <p className="text-gray-600">Created: {formatDate(returnDoc.created_at)}</p>
          </div>
        </div>
        <ReturnActions returnDoc={returnDoc} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">
                {returnDoc.return_type === 'customer' ? 'Customer:' : 'Supplier:'}
              </span>
              <p className="font-medium">{returnDoc.partner_name || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Location:</span>
              <p className="font-medium">{returnDoc.location?.name}</p>
            </div>
            {returnDoc.reason && (
              <div>
                <span className="text-sm text-gray-500">Reason:</span>
                <p>{returnDoc.reason}</p>
              </div>
            )}
            {returnDoc.notes && (
              <div>
                <span className="text-sm text-gray-500">Notes:</span>
                <p>{returnDoc.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">Total Items:</span>
              <p className="font-medium">{returnDoc.lines?.length || 0}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Stock Impact:</span>
              <p className="font-medium">
                {returnDoc.return_type === 'customer' ? 'Adds to inventory' : 'Removes from inventory'}
              </p>
            </div>
            {returnDoc.status === 'completed' && returnTotal > 0 && (
              <div>
                <span className="text-sm text-gray-500">Total Value:</span>
                <p className="font-medium">{formatCurrency(returnTotal)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
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
              {returnDoc.lines?.map((line: any) => (
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
        </CardContent>
      </Card>
    </div>
  )
}
