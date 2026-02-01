'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Package, XCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { confirmPurchaseOrder, cancelPurchaseOrder } from '@/lib/actions/purchase-orders'
import type { PurchaseOrder } from '@/types'

interface PurchaseOrderActionsProps {
  po: PurchaseOrder
}

export function PurchaseOrderActions({ po }: PurchaseOrderActionsProps) {
  const router = useRouter()

  const handleConfirm = async () => {
    const result = await confirmPurchaseOrder(po.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Purchase order confirmed')
      router.refresh()
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this purchase order?')) return
    const result = await cancelPurchaseOrder(po.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Purchase order cancelled')
      router.refresh()
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {po.status === 'draft' && (
        <Button onClick={handleConfirm}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Confirm
        </Button>
      )}

      {(po.status === 'confirmed' || po.status === 'partial') && (
        <Link href={`/purchase-orders/${po.id}/receive`}>
          <Button>
            <Package className="mr-2 h-4 w-4" />
            Receive Items
          </Button>
        </Link>
      )}

      {(po.status === 'draft' || po.status === 'confirmed') && (
        <Button variant="outline" onClick={handleCancel}>
          <XCircle className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      )}
    </div>
  )
}
