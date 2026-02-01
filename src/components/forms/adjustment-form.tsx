'use client'

import { useMemo } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { createAdjustmentSchema, type AdjustmentFormData } from '@/lib/validations/adjustment'
import { createAdjustment } from '@/lib/actions/adjustments'
import { useTranslation } from '@/lib/i18n'
import type { Location, Product } from '@/types'

interface AdjustmentFormProps {
  locations: Location[]
  products: Product[]
}

export function AdjustmentForm({ locations, products }: AdjustmentFormProps) {
  const router = useRouter()
  const { t } = useTranslation()

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
    defaultValues: {
      location_id: '',
      reason: 'correction',
      notes: '',
      lines: [{ product_id: '', qty: 0, lot_number: '', expiry_date: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  })

  const activeLocations = locations.filter((l) => l.active)
  const activeProducts = products.filter((p) => p.active)

  const onSubmit = async (data: AdjustmentFormData) => {
    try {
      const result = await createAdjustment(data)

      if (result?.error) {
        if (typeof result.error === 'object') {
          Object.entries(result.error).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg) => toast.error(`${field}: ${msg}`))
            }
          })
        }
        return
      }

      toast.success(t('toast.adjustmentCreated'))
    } catch (error) {
      toast.error(t('toast.errorOccurred'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('adjustments.adjustmentDetails')}</CardTitle>
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
            onClick={() => append({ product_id: '', qty: 0, lot_number: '', expiry_date: '' })}
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

          <div className="space-y-4">
            {fields.map((field, index) => {
              const selectedProduct = activeProducts.find(
                (p) => p.id === watch(`lines.${index}.product_id`)
              )

              return (
                <div key={field.id} className="flex gap-4 items-start p-4 border rounded-lg">
                  <div className="flex-1 grid gap-4 md:grid-cols-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>{t('products.title')} *</Label>
                      <Select
                        value={watch(`lines.${index}.product_id`)}
                        onValueChange={(value) => setValue(`lines.${index}.product_id`, value)}
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
                        <p className="text-sm text-red-600">
                          {errors.lines[index]?.product_id?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>{t('common.quantity')} *</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        {...register(`lines.${index}.qty`)}
                        placeholder="+10 / -5"
                      />
                      {errors.lines?.[index]?.qty && (
                        <p className="text-sm text-red-600">
                          {errors.lines[index]?.qty?.message}
                        </p>
                      )}
                    </div>

                    {selectedProduct?.track_lot && (
                      <div className="space-y-2">
                        <Label>{t('stock.lotNumber')}</Label>
                        <Input {...register(`lines.${index}.lot_number`)} />
                      </div>
                    )}

                    {selectedProduct?.track_expiry && (
                      <div className="space-y-2">
                        <Label>{t('stock.expiryDate')}</Label>
                        <Input type="date" {...register(`lines.${index}.expiry_date`)} />
                      </div>
                    )}
                  </div>

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : t('adjustments.createAdjustment')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/adjustments')}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
