'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { receivePurchaseOrder } from '@/lib/actions/purchase-orders'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { PurchaseOrderLine, Product } from '@/types'

interface ReceiveFormProps {
  poId: string
  lines: (PurchaseOrderLine & { product?: Product })[]
}

interface ReceiveLine {
  line_id: string
  product_id: string
  qty_to_receive: number
  lot_number: string
  expiry_date: string
}

export function ReceiveForm({ poId, lines }: ReceiveFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receiveLines, setReceiveLines] = useState<ReceiveLine[]>(
    lines.map((line) => ({
      line_id: line.id,
      product_id: line.product_id,
      qty_to_receive: line.qty_ordered - line.qty_received,
      lot_number: '',
      expiry_date: '',
    }))
  )

  const updateLine = (index: number, field: keyof ReceiveLine, value: string | number) => {
    setReceiveLines((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate at least one line has qty > 0
    const hasQty = receiveLines.some((line) => line.qty_to_receive > 0)
    if (!hasQty) {
      toast.error(t('purchaseOrders.enterQtyToReceive'))
      return
    }

    setIsSubmitting(true)
    try {
      const result = await receivePurchaseOrder(poId, { lines: receiveLines })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(t('purchaseOrders.itemsReceivedSuccess'))
        router.push(`/purchase-orders/${poId}`)
      }
    } catch (error) {
      toast.error(t('common.errorOccurred'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{t('purchaseOrders.itemsToReceive')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">{t('products.product')}</TableHead>
                  <TableHead className="text-right">{t('purchaseOrders.ordered')}</TableHead>
                  <TableHead className="text-right">{t('purchaseOrders.received')}</TableHead>
                  <TableHead className="text-right">{t('purchaseOrders.remaining')}</TableHead>
                  <TableHead className="w-[100px]">{t('purchaseOrders.qtyToReceive')}</TableHead>
                  <TableHead className="w-[120px]">{t('purchaseOrders.lot')}</TableHead>
                  <TableHead className="w-[140px]">{t('purchaseOrders.expiry')}</TableHead>
                  <TableHead className="text-right">{t('purchaseOrders.unitCost')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => {
                  const remaining = line.qty_ordered - line.qty_received
                  const product = line.product

                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div>
                          <span className="font-mono text-sm">{product?.sku}</span>
                          <p className="text-sm text-gray-600">{product?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {line.qty_ordered} {product?.base_uom}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.qty_received} {product?.base_uom}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        {remaining} {product?.base_uom}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={remaining}
                          step="any"
                          value={receiveLines[index]?.qty_to_receive || 0}
                          onChange={(e) =>
                            updateLine(index, 'qty_to_receive', parseFloat(e.target.value) || 0)
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        {product?.track_lot ? (
                          <Input
                            type="text"
                            placeholder={t('purchaseOrders.lot')}
                            value={receiveLines[index]?.lot_number || ''}
                            onChange={(e) => updateLine(index, 'lot_number', e.target.value)}
                            className="w-28"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {product?.track_expiry ? (
                          <Input
                            type="date"
                            value={receiveLines[index]?.expiry_date || ''}
                            onChange={(e) => updateLine(index, 'expiry_date', e.target.value)}
                            className="w-36"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(line.unit_cost)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('purchaseOrders.processing') : t('purchaseOrders.confirmReceive')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/purchase-orders/${poId}`)}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
