'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { processReturn, cancelReturn } from '@/lib/actions/returns'
import type { Return } from '@/types'

interface ReturnActionsProps {
  returnDoc: Return
}

export function ReturnActions({ returnDoc }: ReturnActionsProps) {
  const router = useRouter()

  const handleProcess = async () => {
    const action = returnDoc.return_type === 'customer'
      ? 'add items to inventory'
      : 'remove items from inventory'

    if (!confirm(`Process this return? This will ${action}.`)) return

    const result = await processReturn(returnDoc.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Return processed successfully')
      router.refresh()
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this return?')) return
    const result = await cancelReturn(returnDoc.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Return cancelled')
      router.refresh()
    }
  }

  if (returnDoc.status !== 'draft') {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={handleProcess}>
        <CheckCircle className="mr-2 h-4 w-4" />
        Process Return
      </Button>
      <Button variant="outline" onClick={handleCancel}>
        <XCircle className="mr-2 h-4 w-4" />
        Cancel
      </Button>
    </div>
  )
}
