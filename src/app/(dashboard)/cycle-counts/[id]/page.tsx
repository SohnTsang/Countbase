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
import { formatDate } from '@/lib/utils'
import { CountEntryForm } from '@/components/forms/count-entry-form'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default async function CycleCountDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cycleCount, error } = await supabase
    .from('cycle_counts')
    .select(`
      *,
      location:locations(id, name, type),
      lines:cycle_count_lines(
        id,
        product_id,
        system_qty,
        counted_qty,
        lot_number,
        expiry_date,
        product:products(id, sku, name, base_uom)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !cycleCount) {
    notFound()
  }

  const totalItems = cycleCount.lines?.length || 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countedItems = cycleCount.lines?.filter((l: any) => l.counted_qty !== null).length || 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const varianceItems = cycleCount.lines?.filter((l: any) =>
    l.counted_qty !== null && l.counted_qty !== l.system_qty
  ).length || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/cycle-counts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{cycleCount.count_number}</h1>
              <Badge className={statusColors[cycleCount.status] || ''}>
                {cycleCount.status.charAt(0).toUpperCase() + cycleCount.status.slice(1)}
              </Badge>
            </div>
            <p className="text-gray-600">
              {cycleCount.location?.name} | Count Date: {formatDate(cycleCount.count_date)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Counted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {countedItems} / {totalItems}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Variances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${varianceItems > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {varianceItems}
            </div>
          </CardContent>
        </Card>
      </div>

      {cycleCount.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{cycleCount.notes}</p>
          </CardContent>
        </Card>
      )}

      {cycleCount.status === 'draft' ? (
        <CountEntryForm countId={id} lines={cycleCount.lines || []} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Count Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Lot #</TableHead>
                    <TableHead className="text-right">System Qty</TableHead>
                    <TableHead className="text-right">Counted Qty</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {cycleCount.lines?.map((line: any) => {
                    const variance = (line.counted_qty || 0) - line.system_qty
                    return (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div>
                            <span className="font-mono text-sm">{line.product?.sku}</span>
                            <p className="text-sm text-gray-600">{line.product?.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>{line.lot_number || '-'}</TableCell>
                        <TableCell className="text-right">
                          {line.system_qty} {line.product?.base_uom}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.counted_qty ?? '-'} {line.counted_qty !== null ? line.product?.base_uom : ''}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={variance === 0 ? 'secondary' : variance > 0 ? 'default' : 'destructive'}
                          >
                            {variance > 0 ? '+' : ''}{variance}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
