'use client'

import { useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createReturnSchema, type ReturnFormData } from '@/lib/validations/return'
import { createReturn } from '@/lib/actions/returns'
import { useTranslation } from '@/lib/i18n'
import type { Customer, Supplier, Location, Product } from '@/types'

interface ReturnFormProps {
  customers: Customer[]
  suppliers: Supplier[]
  locations: Location[]
  products: Product[]
}

export function ReturnForm({ customers, suppliers, locations, products }: ReturnFormProps) {
  const router = useRouter()
  const { t } = useTranslation()

  const schema = useMemo(() => createReturnSchema(t), [t])

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReturnFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      return_type: 'customer',
      location_id: '',
      partner_id: '',
      partner_name: '',
      reason: '',
      notes: '',
      lines: [{ product_id: '', qty: 1, lot_number: '', expiry_date: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  })

  const watchedReturnType = watch('return_type')
  const watchedPartnerId = watch('partner_id')

  const partners = watchedReturnType === 'customer' ? customers : suppliers

  const onSubmit = async (data: ReturnFormData) => {
    // Set partner name from selected partner
    if (data.partner_id) {
      const partner = partners.find((p) => p.id === data.partner_id)
      data.partner_name = partner?.name || null
    }

    try {
      const result = await createReturn(data)

      if (result?.error) {
        if (typeof result.error === 'object' && '_form' in result.error) {
          toast.error((result.error as { _form: string[] })._form?.[0])
        } else {
          toast.error(t('common.validationError'))
        }
        return
      }
      toast.success(t('toast.returnCreated'))
    } catch (error) {
      toast.error(t('common.errorOccurred'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('returns.newReturn')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('returns.returnType')} *</Label>
              <Select
                value={watch('return_type')}
                onValueChange={(value: 'customer' | 'supplier') => {
                  setValue('return_type', value)
                  setValue('partner_id', '')
                  setValue('partner_name', '')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">{t('returns.returnFromCustomerDesc')}</SelectItem>
                  <SelectItem value="supplier">{t('returns.returnToSupplierDesc')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.return_type && (
                <p className="text-sm text-red-600">{errors.return_type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('stock.location')} *</Label>
              <Select
                value={watch('location_id')}
                onValueChange={(value) => setValue('location_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('cycleCounts.selectLocation')} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location_id && (
                <p className="text-sm text-red-600">{errors.location_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{watchedReturnType === 'customer' ? t('customers.customer') : t('suppliers.supplier')}</Label>
              <Select
                value={watchedPartnerId || 'none'}
                onValueChange={(value) => setValue('partner_id', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('returns.selectOptional')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('returns.noneOption')}</SelectItem>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code ? `${p.code} - ${p.name}` : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!watchedPartnerId && (
              <div className="space-y-2">
                <Label htmlFor="partner_name">{t('returns.partnerNameFreeText')}</Label>
                <Input
                  id="partner_name"
                  {...register('partner_name')}
                  placeholder={t('returns.enterNameNotInList')}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">{t('returns.reason')}</Label>
            <Input
              id="reason"
              {...register('reason')}
              placeholder={t('returns.reasonPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('common.notes')}</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder={t('cycleCounts.optionalNotes')}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('returns.items')}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ product_id: '', qty: 1, lot_number: '', expiry_date: '' })}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('returns.addItem')}
          </Button>
        </CardHeader>
        <CardContent>
          {errors.lines && 'message' in errors.lines && (
            <p className="text-sm text-red-600 mb-4">{errors.lines.message}</p>
          )}

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">{t('products.product')}</TableHead>
                  <TableHead className="w-[100px]">{t('returns.qty')}</TableHead>
                  <TableHead className="w-[120px]">{t('purchaseOrders.lot')}</TableHead>
                  <TableHead className="w-[140px]">{t('purchaseOrders.expiry')}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const product = products.find((p) => p.id === watch(`lines.${index}.product_id`))

                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Select
                          value={watch(`lines.${index}.product_id`)}
                          onValueChange={(value) => setValue(`lines.${index}.product_id`, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('cycleCounts.selectProduct')} />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.sku} - {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.lines?.[index]?.product_id && (
                          <p className="text-xs text-red-600 mt-1">
                            {errors.lines[index]?.product_id?.message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          step="any"
                          {...register(`lines.${index}.qty`)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        {product?.track_lot ? (
                          <Input
                            type="text"
                            placeholder={t('purchaseOrders.lot')}
                            {...register(`lines.${index}.lot_number`)}
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
                            {...register(`lines.${index}.expiry_date`)}
                            className="w-36"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="h-8 w-8 p-0 text-red-600"
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
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('returns.creating') : t('returns.createReturn')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/returns')}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
