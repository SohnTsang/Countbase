'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Send, CheckCircle, Pencil, XCircle } from 'lucide-react'
import Link from 'next/link'
import { sendTransfer, receiveTransfer, cancelTransfer } from '@/lib/actions/transfers'
import { useTranslation } from '@/lib/i18n'
import type { Transfer } from '@/types'

interface TransferActionsProps {
  transfer: Transfer
}

export function TransferActions({ transfer }: TransferActionsProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false)
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false)
  const [sendDate, setSendDate] = useState(new Date().toISOString().split('T')[0])
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSend = async () => {
    setIsProcessing(true)
    const result = await sendTransfer(transfer.id, sendDate)
    setIsProcessing(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(t('toast.transferSent'))
      setIsSendDialogOpen(false)
      router.refresh()
    }
  }

  const handleReceive = async () => {
    setIsProcessing(true)
    const result = await receiveTransfer(transfer.id, receiveDate)
    setIsProcessing(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(t('toast.transferReceived'))
      setIsReceiveDialogOpen(false)
      router.refresh()
    }
  }

  const handleCancel = async () => {
    if (!confirm(t('transfers.confirmCancel'))) return
    const result = await cancelTransfer(transfer.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(t('toast.transferCancelled'))
      router.refresh()
    }
  }

  return (
    <>
      {transfer.status === 'draft' && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/transfers/${transfer.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          </Link>
          <Button onClick={() => setIsSendDialogOpen(true)}>
            <Send className="mr-2 h-4 w-4" />
            {t('transfers.sendTransfer')}
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            <XCircle className="mr-2 h-4 w-4" />
            {t('common.cancel')}
          </Button>
        </div>
      )}

      {transfer.status === 'confirmed' && (
        <Button onClick={() => setIsReceiveDialogOpen(true)}>
          <CheckCircle className="mr-2 h-4 w-4" />
          {t('transfers.receiveTransfer')}
        </Button>
      )}

      {/* Send Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('transfers.confirmSendTitle')}</DialogTitle>
            <DialogDescription>
              {t('transfers.confirmSendDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="send_date">{t('transfers.sendDate')}</Label>
              <Input
                id="send_date"
                type="date"
                value={sendDate}
                onChange={(e) => setSendDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSend} disabled={isProcessing}>
              <Send className="mr-2 h-4 w-4" />
              {isProcessing ? t('common.loading') : t('transfers.sendTransfer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('transfers.confirmReceiveTitle')}</DialogTitle>
            <DialogDescription>
              {t('transfers.confirmReceiveDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="receive_date">{t('transfers.receiveDate')}</Label>
              <Input
                id="receive_date"
                type="date"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleReceive} disabled={isProcessing}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {isProcessing ? t('common.loading') : t('transfers.receiveTransfer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
