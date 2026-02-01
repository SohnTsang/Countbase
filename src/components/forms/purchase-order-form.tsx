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
import { createPurchaseOrderSchema, type PurchaseOrderFormData } from '@/lib/validations/purchase-order'
import { createPurchaseOrder } from '@/lib/actions/purchase-orders'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { Supplier, Location, Product } from '@/types'

interface PurchaseOrderFormProps {
  suppliers: Supplier[]
  locations: Location[]
  products: Product[]
}

export function PurchaseOrderForm({ suppliers, locations, products }: PurchaseOrderFormProps) {
  const router = useRouter()
  const { t } = useTranslation()

  const schema = useMemo(() => createPurchaseOrderSchema(t), [t])

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseOrderFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      supplier_id: '',
      location_id: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_date: '',
      notes: '',
      lines: [{ product_id: '', qty_ordered: 1, unit_cost: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  })

  const watchedLines = watch('lines')

  const calculateLineTotal = (index: number) => {
    const line = watchedLines[index]
    return (line?.qty_ordered || 0) * (line?.unit_cost || 0)
  }

  const calculateOrderTotal = () => {
    return watchedLines.reduce((sum, line) => {
      return sum + (line?.qty_ordered || 0) * (line?.unit_cost || 0)
    }, 0)
  }

  const onSubmit = async (data: PurchaseOrderFormData) => {
    try {
      const result = await createPurchaseOrder(data)

      if (result?.error) {
        if (typeof result.error === 'object' && '_form' in result.error) {
          toast.error((result.error as { _form: string[] })._form?.[0])
        } else {
          toast.error(t('toast.validationError'))
        }
        return
      }
      toast.success(t('toast.purchaseOrderCreated'))
    } catch (error) {
      toast.error(t('toast.errorOccurred'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('purchaseOrders.newOrder')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('purchaseOrders.supplier')} *</Label>
              <Select
                value={watch('supplier_id')}
                onValueChange={(value) => setValue('supplier_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.selectOption')} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code ? `${s.code} - ${s.name}` : s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplier_id && (
                <p className="text-sm text-red-600">{errors.supplier_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('purchaseOrders.receiveToLocation')} *</Label>
              <Select
                value={watch('location_id')}
                onValueChange={(value) => setValue('location_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.selectOption')} />
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
              <Label htmlFor="order_date">{t('purchaseOrders.orderDate')} *</Label>
              <Input
                id="order_date"
                type="date"
                {...register('order_date')}
              />
              {errors.order_date && (
                <p className="text-sm text-red-600">{errors.order_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_date">{t('purchaseOrders.expectedDate')}</Label>
              <Input
                id="expected_date"
                type="date"
                {...register('expected_date')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('common.notes')}</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder={t('common.optional')}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('purchaseOrders.lineItems')}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ product_id: '', qty_ordered: 1, unit_cost: 0 })}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('common.addLine')}
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
                  <TableHead className="w-[300px]">{t('products.title')}</TableHead>
                  <TableHead className="w-[120px]">{t('common.quantity')}</TableHead>
                  <TableHead className="w-[140px]">{t('purchaseOrders.unitCost')}</TableHead>
                  <TableHead className="w-[120px] text-right">{t('common.total')}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Select
                        value={watch(`lines.${index}.product_id`)}
                        onValueChange={(value) => setValue(`lines.${index}.product_id`, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.selectOption')} />
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
                        {...register(`lines.${index}.qty_ordered`)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...register(`lines.${index}.unit_cost`)}
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(calculateLineTotal(index))}
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
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="text-lg font-bold">
              {t('purchaseOrders.orderTotal')}: {formatCurrency(calculateOrderTotal())}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : t('purchaseOrders.createOrder')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/purchase-orders')}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
