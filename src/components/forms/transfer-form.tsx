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
import { createTransferSchema, type TransferFormData } from '@/lib/validations/transfer'
import { createTransfer } from '@/lib/actions/transfers'
import { useTranslation } from '@/lib/i18n'
import type { Location, Product } from '@/types'

interface TransferFormProps {
  locations: Location[]
  products: Product[]
}

export function TransferForm({ locations, products }: TransferFormProps) {
  const router = useRouter()
  const { t } = useTranslation()

  const schema = useMemo(() => createTransferSchema(t), [t])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TransferFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      from_location_id: '',
      to_location_id: '',
      notes: '',
      lines: [{ product_id: '', qty: 1, lot_number: '', expiry_date: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  })

  const fromLocationId = watch('from_location_id')
  const activeLocations = locations.filter((l) => l.active)
  const activeProducts = products.filter((p) => p.active)

  const onSubmit = async (data: TransferFormData) => {
    try {
      const result = await createTransfer(data)

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

      toast.success(t('toast.transferCreated'))
    } catch (error) {
      toast.error(t('toast.errorOccurred'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('transfers.transferDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('transfers.fromLocation')} *</Label>
              <Select
                value={watch('from_location_id')}
                onValueChange={(value) => setValue('from_location_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('transfers.selectSource')} />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.from_location_id && (
                <p className="text-sm text-red-600">{errors.from_location_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('transfers.toLocation')} *</Label>
              <Select
                value={watch('to_location_id')}
                onValueChange={(value) => setValue('to_location_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('transfers.selectDestination')} />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations
                    .filter((loc) => loc.id !== fromLocationId)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.to_location_id && (
                <p className="text-sm text-red-600">{errors.to_location_id.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('common.notes')}</Label>
            <Textarea {...register('notes')} placeholder={t('common.notes')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('transfers.lineItems')}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ product_id: '', qty: 1, lot_number: '', expiry_date: '' })}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('common.addLine')}
          </Button>
        </CardHeader>
        <CardContent>
          {errors.lines?.message && (
            <p className="text-sm text-red-600 mb-4">{errors.lines.message}</p>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => {
              const selectedProduct = activeProducts.find(
                (p) => p.id === watch(`lines.${index}.product_id`)
              )

              return (
                <div key={field.id} className="flex gap-4 items-start p-4 border rounded-lg">
                  <div className="flex-1 grid gap-4 md:grid-cols-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>{t('stock.product')} *</Label>
                      <Select
                        value={watch(`lines.${index}.product_id`)}
                        onValueChange={(value) => setValue(`lines.${index}.product_id`, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('purchaseOrders.selectProduct')} />
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
                        min="0.0001"
                        {...register(`lines.${index}.qty`)}
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
          {isSubmitting ? t('common.loading') : t('transfers.createTransfer')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/transfers')}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
