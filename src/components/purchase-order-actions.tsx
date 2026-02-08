'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Package, XCircle, CheckCircle, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { confirmPurchaseOrder, cancelPurchaseOrder } from '@/lib/actions/purchase-orders'
import { useTranslation } from '@/lib/i18n'
import type { PurchaseOrder } from '@/types'

interface PurchaseOrderActionsProps {
  po: PurchaseOrder
}

export function PurchaseOrderActions({ po }: PurchaseOrderActionsProps) {
  const router = useRouter()
  const { t } = useTranslation()

  const handleConfirm = async () => {
    const result = await confirmPurchaseOrder(po.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(t('toast.poConfirmed'))
      router.refresh()
    }
  }

  const handleCancel = async () => {
    if (!confirm(t('purchaseOrders.confirmCancel'))) return
    const result = await cancelPurchaseOrder(po.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(t('toast.poCancelled'))
      router.refresh()
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {po.status === 'draft' && (
        <Link href={`/purchase-orders/${po.id}/edit`}>
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            {t('common.edit')}
          </Button>
        </Link>
      )}

      {po.status === 'draft' && (
        <Button onClick={handleConfirm}>
          <CheckCircle className="mr-2 h-4 w-4" />
          {t('purchaseOrders.confirm')}
        </Button>
      )}

      {(po.status === 'confirmed' || po.status === 'partial') && (
        <Link href={`/purchase-orders/${po.id}/receive`}>
          <Button>
            <Package className="mr-2 h-4 w-4" />
            {t('purchaseOrders.receiveItems')}
          </Button>
        </Link>
      )}

      {(po.status === 'draft' || po.status === 'confirmed') && (
        <Button variant="outline" onClick={handleCancel}>
          <XCircle className="mr-2 h-4 w-4" />
          {t('common.cancel')}
        </Button>
      )}
    </div>
  )
}
