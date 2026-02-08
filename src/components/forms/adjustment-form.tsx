'use client'

import { useMemo, useRef } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { createAdjustmentSchema, type AdjustmentFormData } from '@/lib/validations/adjustment'
import { createAdjustment, updateAdjustment } from '@/lib/actions/adjustments'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import { DocumentUpload, type DocumentUploadHandle } from '@/components/documents/document-upload'
import type { Location, Product } from '@/types'

interface AdjustmentFormProps {
  locations: Location[]
  products: Product[]
  currency?: string
  initialData?: {
    id: string
    location_id: string
    reason: string
    notes: string | null
    lines: { product_id: string; qty: number; lot_number: string | null; expiry_date: string | null; unit_cost: number | null }[]
  }
}

export function AdjustmentForm({ locations, products, currency = 'USD', initialData }: AdjustmentFormProps) {
  const router = useRouter()
  const { t, locale } = useTranslation()
  const docUploadRef = useRef<DocumentUploadHandle>(null)
  const isEdit = !!initialData

  const schema = useMemo(() => createAdjustmentSchema(t), [t])

  const REASON_OPTIONS = [
    { value: 'damage', label: t('adjustments.damage') },
    { value: 'shrinkage', label: t('adjustments.shrinkage') },
    { value: 'expiry', label: t('adjustments.expiry') },
    { value: 'correction', label: t('adjustments.correction') },
    { value: 'sample', label: t('adjustments.sample') },
    { value: 'count_variance', label: t('adjustments.countVariance') },
    { value: 'other', label: t('adjustments.other') },
  ]

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdjustmentFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: initialData
      ? {
          location_id: initialData.location_id,
          reason: initialData.reason as 'damage' | 'shrinkage' | 'expiry' | 'correction' | 'sample' | 'count_variance' | 'other',
          notes: initialData.notes || '',
          lines: initialData.lines.map((l) => ({
            product_id: l.product_id,
            qty: l.qty,
            lot_number: l.lot_number || '',
            expiry_date: l.expiry_date || '',
            unit_cost: l.unit_cost || 0,
          })),
        }
      : {
          location_id: '',
          reason: 'correction' as const,
          notes: '',
          lines: [{ product_id: '', qty: 0, lot_number: '', expiry_date: '', unit_cost: 0 }],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  })

  const activeLocations = locations.filter((l) => l.active)
  const activeProducts = products.filter((p) => p.active)

  // Watch all lines for calculating totals
  const watchedLines = watch('lines')

  // Calculate grand total
  const grandTotal = watchedLines.reduce((sum, line) => {
    const qty = Number(line.qty) || 0
    const unitCost = Number(line.unit_cost) || 0
    return sum + Math.abs(qty * unitCost)
  }, 0)

  // Auto-fill unit_cost when product is selected
  const handleProductChange = (index: number, productId: string) => {
    setValue(`lines.${index}.product_id`, productId)
    const product = activeProducts.find((p) => p.id === productId)
    if (product?.current_cost) {
      setValue(`lines.${index}.unit_cost`, product.current_cost)
    }
  }

  const onSubmit = async (data: AdjustmentFormData) => {
    try {
      const result = isEdit
        ? await updateAdjustment(initialData!.id, data)
        : await createAdjustment(data)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = (result as any)?.error
      if (err) {
        if (typeof err === 'object') {
          Object.entries(err).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg) => toast.error(`${field}: ${msg}`))
            }
          })
        }
        return
      }

      toast.success(isEdit ? t('toast.adjustmentUpdated') : t('toast.adjustmentCreated'))
      if (!isEdit && (result as any)?.id) {
        await docUploadRef.current?.uploadQueuedFiles((result as any).id)
      }
      router.replace(isEdit ? `/adjustments/${initialData!.id}` : '/adjustments')
      router.refresh()
    } catch (error) {
      toast.error(t('toast.errorOccurred'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? t('adjustments.editAdjustment') : t('adjustments.adjustmentDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('locations.title')} *</Label>
              <Select
                value={watch('location_id')}
                onValueChange={(value) => setValue('location_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.selectOption')} />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location_id && (
                <p className="text-sm text-red-600">{errors.location_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('adjustments.reason')} *</Label>
              <Select
                value={watch('reason')}
                onValueChange={(value: string) => setValue('reason', value as 'damage' | 'shrinkage' | 'expiry' | 'correction' | 'sample' | 'count_variance' | 'other')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('common.notes')}</Label>
            <Textarea {...register('notes')} placeholder={t('common.optional')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('adjustments.lineItems')}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ product_id: '', qty: 0, lot_number: '', expiry_date: '', unit_cost: 0 })}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('common.addLine')}
          </Button>
        </CardHeader>
        <CardContent>
          {errors.lines?.message && (
            <p className="text-sm text-red-600 mb-4">{errors.lines.message}</p>
          )}

          <p className="text-sm text-gray-500 mb-4">
            {t('adjustments.positiveQty')} / {t('adjustments.negativeQty')}
          </p>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">{t('products.product')} *</TableHead>
                  <TableHead className="w-[100px]">{t('common.quantity')} *</TableHead>
                  <TableHead className="w-[120px]">{t('stock.lotNumber')}</TableHead>
                  <TableHead className="w-[130px]">{t('stock.expiryDate')}</TableHead>
                  <TableHead className="w-[120px]">{t('purchaseOrders.unitCost')}</TableHead>
                  <TableHead className="w-[120px] text-right">{t('common.total')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const qty = Number(watchedLines[index]?.qty) || 0
                  const unitCost = Number(watchedLines[index]?.unit_cost) || 0
                  const lineTotal = Math.abs(qty * unitCost)

                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Select
                          value={watch(`lines.${index}.product_id`)}
                          onValueChange={(value) => handleProductChange(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.selectOption')} />
                          </SelectTrigger>
                          <SelectContent>
                            {activeProducts.map((prod) => (
                              <SelectItem key={prod.id} value={prod.id}>
                                {prod.sku} - {prod.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.lines?.[index]?.product_id && (
                          <p className="text-sm text-red-600 mt-1">
                            {errors.lines[index]?.product_id?.message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.0001"
                          {...register(`lines.${index}.qty`)}
                          placeholder="+10 / -5"
                          className="text-center"
                        />
                        {errors.lines?.[index]?.qty && (
                          <p className="text-sm text-red-600 mt-1">
                            {errors.lines[index]?.qty?.message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          {...register(`lines.${index}.lot_number`)}
                          placeholder={t('common.optional')}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          {...register(`lines.${index}.expiry_date`)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`lines.${index}.unit_cost`)}
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {lineTotal > 0 ? formatCurrency(lineTotal, currency, locale) : '-'}
                      </TableCell>
                      <TableCell>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="text-red-600 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {grandTotal > 0 && (
            <div className="flex justify-end mt-4">
              <div className="text-lg font-bold">
                {t('common.total')}: {formatCurrency(grandTotal, currency, locale)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!isEdit && <DocumentUpload ref={docUploadRef} entityType="adjustment" entityId={null} />}

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : (isEdit ? t('adjustments.updateAdjustment') : t('adjustments.createAdjustment'))}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(isEdit ? `/adjustments/${initialData!.id}` : '/adjustments')}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
