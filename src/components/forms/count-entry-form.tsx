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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { updateCountedQty, postCycleCount } from '@/lib/actions/cycle-counts'
import { useTranslation } from '@/lib/i18n'
import type { CycleCountLine, Product } from '@/types'

interface CountEntryFormProps {
  countId: string
  lines: (CycleCountLine & { product?: Product })[]
}

export function CountEntryForm({ countId, lines }: CountEntryFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [countedValues, setCountedValues] = useState<Record<string, number>>(
    Object.fromEntries(
      lines.map((line) => [line.id, line.counted_qty ?? line.system_qty])
    )
  )

  const updateValue = (lineId: string, value: number) => {
    setCountedValues((prev) => ({ ...prev, [lineId]: value }))
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      const formData = {
        lines: Object.entries(countedValues).map(([line_id, counted_qty]) => ({
          line_id,
          counted_qty,
        })),
      }
      const result = await updateCountedQty(countId, formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(t('toast.countsSaved'))
        router.refresh()
      }
    } catch (error) {
      toast.error(t('toast.errorOccurred'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePost = async () => {
    if (!confirm(t('cycleCounts.confirmPost'))) return

    // First save current counts
    await handleSave()

    setIsSubmitting(true)
    try {
      const result = await postCycleCount(countId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(t('toast.cycleCountPosted'))
        router.push('/cycle-counts')
      }
    } catch (error) {
      toast.error(t('toast.errorOccurred'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalVariance = lines.reduce((sum, line) => {
    const counted = countedValues[line.id] ?? 0
    return sum + (counted - line.system_qty)
  }, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cycleCounts.enterCountedQty')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">{t('products.product')}</TableHead>
                <TableHead>{t('stock.lotNumber')}</TableHead>
                <TableHead className="text-right">{t('cycleCounts.systemQty')}</TableHead>
                <TableHead className="w-[120px]">{t('cycleCounts.countedQty')}</TableHead>
                <TableHead className="text-right">{t('cycleCounts.variance')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const counted = countedValues[line.id] ?? 0
                const variance = counted - line.system_qty

                return (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div>
                        <span className="font-mono text-sm">{line.product?.sku}</span>
                        <p className="text-sm text-gray-600">{line.product?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{line.lot_number || '-'}</TableCell>
                    <TableCell className="text-right">
                      {line.system_qty} {line.product?.base_uom ? t(`uom.${line.product.base_uom}`) : ''}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={counted}
                        onChange={(e) => updateValue(line.id, parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={variance === 0 ? 'secondary' : variance > 0 ? 'default' : 'destructive'}
                      >
                        {variance > 0 ? '+' : ''}{variance} {line.product?.base_uom ? t(`uom.${line.product.base_uom}`) : ''}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="text-sm">
            {t('cycleCounts.totalVariance')}:{' '}
            <span className={totalVariance === 0 ? 'text-green-600' : 'text-red-600 font-medium'}>
              {totalVariance > 0 ? '+' : ''}{totalVariance} {t('common.units')}
            </span>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleSave} disabled={isSubmitting}>
              {t('cycleCounts.saveCounts')}
            </Button>
            <Button onClick={handlePost} disabled={isSubmitting}>
              {isSubmitting ? t('common.loading') : t('cycleCounts.postCount')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
