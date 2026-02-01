'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CheckCircle, XCircle } from 'lucide-react'
import { postAdjustment, cancelAdjustment } from '@/lib/actions/adjustments'
import type { Adjustment } from '@/types'

interface AdjustmentActionsProps {
  adjustment: Adjustment
}

export function AdjustmentActions({ adjustment }: AdjustmentActionsProps) {
  const router = useRouter()

  const handlePost = async () => {
    if (!confirm('Post this adjustment? Inventory will be updated.')) return
    const result = await postAdjustment(adjustment.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Adjustment posted')
      router.refresh()
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this adjustment?')) return
    const result = await cancelAdjustment(adjustment.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Adjustment cancelled')
      router.refresh()
    }
  }

  if (adjustment.status === 'draft') {
    return (
      <div className="flex gap-2">
        <Button onClick={handlePost}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Post Adjustment
        </Button>
        <Button variant="destructive" onClick={handleCancel}>
          <XCircle className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    )
  }

  return null
}
