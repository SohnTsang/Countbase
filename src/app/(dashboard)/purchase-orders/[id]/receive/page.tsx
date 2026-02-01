import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { ReceiveForm } from '@/components/forms/receive-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ReceivePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: po, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(id, name, code),
      location:locations(id, name),
      lines:purchase_order_lines(
        id,
        product_id,
        qty_ordered,
        qty_received,
        unit_cost,
        product:products(id, sku, name, base_uom, track_expiry, track_lot)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !po) {
    notFound()
  }

  if (po.status !== 'confirmed' && po.status !== 'partial') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/purchase-orders/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cannot Receive</h1>
            <p className="text-gray-600">
              This PO is {po.status}. Only confirmed or partial POs can receive items.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Filter lines with remaining quantity
  const linesToReceive = po.lines?.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (line: any) => line.qty_ordered > line.qty_received
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/purchase-orders/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Receive: {po.po_number}</h1>
            <Badge variant="secondary">
              {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
            </Badge>
          </div>
          <p className="text-gray-600">
            From: {po.supplier?.name} | To: {po.location?.name}
          </p>
        </div>
      </div>

      <ReceiveForm poId={id} lines={linesToReceive || []} />
    </div>
  )
}
