'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { getStockMovements, type StockMovementWithDetails } from '@/lib/actions/stock'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { InventoryBalance } from '@/types'
import {
  Package,
  Truck,
  ArrowRightLeft,
  ClipboardList,
  RotateCcw,
  Calculator,
  XCircle,
} from 'lucide-react'

const referenceTypeToPath: Record<string, string> = {
  po: '/purchase-orders',
  shipment: '/shipments',
  transfer: '/transfers',
  adjustment: '/adjustments',
  cycle_count: '/cycle-counts',
  return: '/returns',
}

interface StockHistorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stockItem: InventoryBalance | null
  currency?: string
}

const movementTypeIcons: Record<string, typeof Package> = {
  receive: Package,
  ship: Truck,
  transfer_out: ArrowRightLeft,
  transfer_in: ArrowRightLeft,
  adjustment: ClipboardList,
  count_variance: Calculator,
  return_in: RotateCcw,
  return_out: RotateCcw,
  void: XCircle,
}

export function StockHistorySheet({
  open,
  onOpenChange,
  stockItem,
  currency = 'USD',
}: StockHistorySheetProps) {
  const [movements, setMovements] = useState<StockMovementWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t, locale } = useTranslation()

  const movementLabels: Record<string, string> = {
    receive: t('movementTypes.receive'),
    ship: t('movementTypes.ship'),
    transfer_out: t('movementTypes.transfer_out'),
    transfer_in: t('movementTypes.transfer_in'),
    adjustment: t('movementTypes.adjustment'),
    count_variance: t('movementTypes.count_variance'),
    return_in: t('movementTypes.return_in'),
    return_out: t('movementTypes.return_out'),
    void: t('movementTypes.void'),
  }

  const reasonLabels: Record<string, string> = {
    damage: t('adjustments.damage'),
    shrinkage: t('adjustments.shrinkage'),
    expiry: t('adjustments.expiry'),
    correction: t('adjustments.correction'),
    sample: t('adjustments.sample'),
    count_variance: t('adjustments.countVariance'),
    other: t('adjustments.other'),
  }

  useEffect(() => {
    if (open && stockItem) {
      setLoading(true)
      setError(null)
      getStockMovements({
        productId: stockItem.product_id,
        locationId: stockItem.location_id,
        lotNumber: stockItem.lot_number,
      })
        .then((result) => {
          if (result.error) {
            setError(result.error)
          } else {
            setMovements(result.data || [])
          }
        })
        .finally(() => setLoading(false))
    }
  }, [open, stockItem])

  const getDocumentLink = (movement: StockMovementWithDetails): string | null => {
    if (!movement.reference_type || !movement.reference_id) return null
    const basePath = referenceTypeToPath[movement.reference_type]
    if (!basePath) return null
    return `${basePath}/${movement.reference_id}`
  }

  const getMovementDetail = (movement: StockMovementWithDetails): string => {
    switch (movement.movement_type) {
      case 'receive':
        return movement.partner_name || ''
      case 'ship':
        return movement.partner_name ? `→ ${movement.partner_name}` : ''
      case 'transfer_out':
        return movement.to_location_name ? `→ ${movement.to_location_name}` : ''
      case 'transfer_in':
        return movement.from_location_name ? `← ${movement.from_location_name}` : ''
      case 'adjustment':
        return movement.reason ? reasonLabels[movement.reason] || movement.reason : ''
      case 'return_in':
        return movement.partner_name ? `← ${movement.partner_name}` : ''
      case 'return_out':
        return movement.partner_name ? `→ ${movement.partner_name}` : ''
      default:
        return ''
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>{t('stock.movementHistory')}</SheetTitle>
          {stockItem && (
            <SheetDescription asChild>
              <div className="space-y-1">
                <div className="font-mono text-sm font-medium">{stockItem.product?.sku}</div>
                <div className="text-sm">{stockItem.product?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {stockItem.location?.name}
                  {stockItem.lot_number && ` • ${t('stock.lot')}: ${stockItem.lot_number}`}
                </div>
              </div>
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="py-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 border rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : movements.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t('stock.noMovementHistory')}
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((movement) => {
                const Icon = movementTypeIcons[movement.movement_type] || XCircle
                const documentLink = getDocumentLink(movement)
                const detail = getMovementDetail(movement)
                const extendedCost = Math.abs(movement.qty * (movement.unit_cost || 0))

                return (
                  <div
                    key={movement.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Row 1: Type + Quantity + Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {movementLabels[movement.movement_type] || movement.movement_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-lg font-semibold ${
                            movement.qty > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {movement.qty > 0 ? '+' : ''}
                          {movement.qty.toLocaleString()} {t(`uom.${stockItem?.product?.base_uom}`)}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(movement.created_at, locale)}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Document number (clickable) + Detail */}
                    {(movement.document_number || detail) && (
                      <div className="text-sm text-muted-foreground mt-1 ml-6">
                        {movement.document_number && documentLink ? (
                          <Link
                            href={documentLink}
                            className="text-blue-600 hover:underline"
                            onClick={() => onOpenChange(false)}
                          >
                            {movement.document_number}
                          </Link>
                        ) : movement.document_number ? (
                          <span>{movement.document_number}</span>
                        ) : null}
                        {movement.document_number && detail && <span> • </span>}
                        {detail && <span>{detail}</span>}
                      </div>
                    )}

                    {/* Row 3: Cost info */}
                    {movement.unit_cost !== null && movement.unit_cost > 0 && (
                      <div className="text-xs text-muted-foreground mt-1 ml-6">
                        {formatCurrency(movement.unit_cost, currency, locale)}/{t(`uom.${stockItem?.product?.base_uom}`)} • {t('common.total')}: {formatCurrency(extendedCost, currency, locale)}
                      </div>
                    )}

                    {/* Row 4: Notes */}
                    {movement.notes && (
                      <div className="text-xs text-muted-foreground italic mt-1 ml-6">
                        {movement.notes}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
