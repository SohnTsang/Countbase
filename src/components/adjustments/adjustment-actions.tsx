'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CheckCircle, Pencil, XCircle } from 'lucide-react'
import Link from 'next/link'
import { postAdjustment, cancelAdjustment } from '@/lib/actions/adjustments'
import { useTranslation } from '@/lib/i18n'
import type { Adjustment } from '@/types'

interface AdjustmentActionsProps {
  adjustment: Adjustment
}

export function AdjustmentActions({ adjustment }: AdjustmentActionsProps) {
  const router = useRouter()
  const { t } = useTranslation()

  const handlePost = async () => {
    if (!confirm(t('adjustments.confirmPost'))) return
    const result = await postAdjustment(adjustment.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(t('toast.adjustmentPosted'))
      router.refresh()
    }
  }

  const handleCancel = async () => {
    if (!confirm(t('dialog.cancelMessage'))) return
    const result = await cancelAdjustment(adjustment.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(t('toast.adjustmentCancelled'))
      router.refresh()
    }
  }

  if (adjustment.status === 'draft') {
    return (
      <div className="flex gap-2">
        <Link href={`/adjustments/${adjustment.id}/edit`}>
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            {t('common.edit')}
          </Button>
        </Link>
        <Button onClick={handlePost}>
          <CheckCircle className="mr-2 h-4 w-4" />
          {t('adjustments.post')}
        </Button>
        <Button variant="destructive" onClick={handleCancel}>
          <XCircle className="mr-2 h-4 w-4" />
          {t('common.cancel')}
        </Button>
      </div>
    )
  }

  return null
}
