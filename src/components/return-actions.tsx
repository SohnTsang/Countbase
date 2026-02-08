'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, Pencil, XCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { processReturn, cancelReturn } from '@/lib/actions/returns'
import { useTranslation } from '@/lib/i18n'
import type { Return } from '@/types'

interface ReturnActionsProps {
  returnDoc: Return
}

export function ReturnActions({ returnDoc }: ReturnActionsProps) {
  const router = useRouter()
  const { t } = useTranslation()

  const handleProcess = async () => {
    const confirmMessage = returnDoc.return_type === 'customer'
      ? t('returns.confirmProcessCustomer')
      : t('returns.confirmProcessSupplier')

    if (!confirm(confirmMessage)) return

    const result = await processReturn(returnDoc.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(t('returns.returnProcessed'))
      router.refresh()
    }
  }

  const handleCancel = async () => {
    if (!confirm(t('returns.confirmCancel'))) return
    const result = await cancelReturn(returnDoc.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(t('returns.returnCancelled'))
      router.refresh()
    }
  }

  if (returnDoc.status !== 'draft') {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/returns/${returnDoc.id}/edit`}>
        <Button variant="outline">
          <Pencil className="mr-2 h-4 w-4" />
          {t('common.edit')}
        </Button>
      </Link>
      <Button onClick={handleProcess}>
        <CheckCircle className="mr-2 h-4 w-4" />
        {t('returns.processReturn')}
      </Button>
      <Button variant="outline" onClick={handleCancel}>
        <XCircle className="mr-2 h-4 w-4" />
        {t('common.cancel')}
      </Button>
    </div>
  )
}
