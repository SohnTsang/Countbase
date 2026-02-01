'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Send, CheckCircle, XCircle } from 'lucide-react'
import { sendTransfer, receiveTransfer, cancelTransfer } from '@/lib/actions/transfers'
import type { Transfer } from '@/types'

interface TransferActionsProps {
  transfer: Transfer
}

export function TransferActions({ transfer }: TransferActionsProps) {
  const router = useRouter()

  const handleSend = async () => {
    if (!confirm('Send this transfer? Stock will be deducted from source location.')) return
    const result = await sendTransfer(transfer.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Transfer sent')
      router.refresh()
    }
  }

  const handleReceive = async () => {
    if (!confirm('Receive this transfer? Stock will be added to destination location.')) return
    const result = await receiveTransfer(transfer.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Transfer received')
      router.refresh()
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this transfer?')) return
    const result = await cancelTransfer(transfer.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Transfer cancelled')
      router.refresh()
    }
  }

  if (transfer.status === 'draft') {
    return (
      <div className="flex gap-2">
        <Button onClick={handleSend}>
          <Send className="mr-2 h-4 w-4" />
          Send Transfer
        </Button>
        <Button variant="destructive" onClick={handleCancel}>
          <XCircle className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    )
  }

  if (transfer.status === 'confirmed') {
    return (
      <Button onClick={handleReceive}>
        <CheckCircle className="mr-2 h-4 w-4" />
        Receive Transfer
      </Button>
    )
  }

  return null
}
