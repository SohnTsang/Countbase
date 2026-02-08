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
import { CheckCircle, Pencil, Truck, XCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { confirmShipment, shipShipment, cancelShipment } from '@/lib/actions/shipments'
import { useTranslation } from '@/lib/i18n'
import type { Shipment } from '@/types'

interface ShipmentActionsProps {
  shipment: Shipment
}

export function ShipmentActions({ shipment }: ShipmentActionsProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [isShipDialogOpen, setIsShipDialogOpen] = useState(false)
  const [shipDate, setShipDate] = useState(
    shipment.ship_date || new Date().toISOString().split('T')[0]
  )
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    setIsProcessing(true)
    const result = await confirmShipment(shipment.id)
    setIsProcessing(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(t('toast.shipmentConfirmed'))
      router.refresh()
    }
  }

  const handleShip = async () => {
    setIsProcessing(true)
    const result = await shipShipment(shipment.id, shipDate)
    setIsProcessing(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(t('toast.shipmentCompleted'))
      setIsShipDialogOpen(false)
      router.refresh()
    }
  }

  const handleCancel = async () => {
    if (!confirm(t('shipments.confirmCancel'))) return
    setIsProcessing(true)
    const result = await cancelShipment(shipment.id)
    setIsProcessing(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(t('toast.shipmentCancelled'))
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {shipment.status === 'draft' && (
          <Link href={`/shipments/${shipment.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          </Link>
        )}

        {shipment.status === 'draft' && (
          <Button onClick={handleConfirm} disabled={isProcessing}>
            <CheckCircle className="mr-2 h-4 w-4" />
            {t('common.confirm')}
          </Button>
        )}

        {shipment.status === 'confirmed' && (
          <Button onClick={() => setIsShipDialogOpen(true)} disabled={isProcessing}>
            <Truck className="mr-2 h-4 w-4" />
            {t('shipments.ship')}
          </Button>
        )}

        {(shipment.status === 'draft' || shipment.status === 'confirmed') && (
          <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
            <XCircle className="mr-2 h-4 w-4" />
            {t('common.cancel')}
          </Button>
        )}
      </div>

      <Dialog open={isShipDialogOpen} onOpenChange={setIsShipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('shipments.confirmShipment')}</DialogTitle>
            <DialogDescription>
              {t('shipments.confirmShipDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ship_date">{t('shipments.shipDate')}</Label>
              <Input
                id="ship_date"
                type="date"
                value={shipDate}
                onChange={(e) => setShipDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShipDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleShip} disabled={isProcessing}>
              <Truck className="mr-2 h-4 w-4" />
              {isProcessing ? t('common.loading') : t('shipments.ship')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
