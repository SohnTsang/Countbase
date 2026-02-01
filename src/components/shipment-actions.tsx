'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, Truck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { confirmShipment, shipShipment, cancelShipment } from '@/lib/actions/shipments'
import type { Shipment } from '@/types'

interface ShipmentActionsProps {
  shipment: Shipment
}

export function ShipmentActions({ shipment }: ShipmentActionsProps) {
  const router = useRouter()

  const handleConfirm = async () => {
    const result = await confirmShipment(shipment.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Shipment confirmed')
      router.refresh()
    }
  }

  const handleShip = async () => {
    if (!confirm('Ship this order? Stock will be deducted.')) return
    const result = await shipShipment(shipment.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Shipment completed')
      router.refresh()
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this shipment?')) return
    const result = await cancelShipment(shipment.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Shipment cancelled')
      router.refresh()
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {shipment.status === 'draft' && (
        <Button onClick={handleConfirm}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Confirm
        </Button>
      )}

      {shipment.status === 'confirmed' && (
        <Button onClick={handleShip}>
          <Truck className="mr-2 h-4 w-4" />
          Ship
        </Button>
      )}

      {(shipment.status === 'draft' || shipment.status === 'confirmed') && (
        <Button variant="outline" onClick={handleCancel}>
          <XCircle className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      )}
    </div>
  )
}
