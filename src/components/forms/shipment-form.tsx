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
import { createShipmentSchema, type ShipmentFormData } from '@/lib/validations/shipment'
import { createShipment } from '@/lib/actions/shipments'
import { useTranslation } from '@/lib/i18n'
import type { Customer, Location, Product, InventoryBalance } from '@/types'

interface ShipmentFormProps {
  customers: Customer[]
  locations: Location[]
  products: Product[]
  stockBalances: InventoryBalance[]
}

export function ShipmentForm({ customers, locations, products, stockBalances }: ShipmentFormProps) {
  const router = useRouter()
  const { t } = useTranslation()

  const schema = useMemo(() => createShipmentSchema(t), [t])

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ShipmentFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      location_id: '',
      customer_id: '',
      customer_name: '',
      ship_date: new Date().toISOString().split('T')[0],
      notes: '',
      lines: [{ product_id: '', qty: 1, lot_number: '', expiry_date: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  })

  const watchedLocationId = watch('location_id')
  const watchedCustomerId = watch('customer_id')

  // Get available stock for selected location
  const getAvailableStock = (productId: string) => {
    const balance = stockBalances.find(
      (b) => b.product_id === productId && b.location_id === watchedLocationId
    )
    return balance?.qty_on_hand || 0
  }

  const onSubmit = async (data: ShipmentFormData) => {
    // Clear customer_id if using customer_name
    if (data.customer_name && !data.customer_id) {
      data.customer_id = null
    }

    try {
      const result = await createShipment(data)

      if (result?.error) {
        if (typeof result.error === 'object' && '_form' in result.error) {
          toast.error((result.error as { _form: string[] })._form?.[0])
        } else {
          toast.error(t('toast.validationError'))
        }
        return
      }
      toast.success(t('toast.shipmentCreated'))
    } catch (error) {
      toast.error(t('toast.errorOccurred'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('shipments.newShipment')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('shipments.shipFromLocation')} *</Label>
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

            <div className="space-y-2">
              <Label>{t('shipments.customer')}</Label>
              <Select
                value={watchedCustomerId || 'none'}
                onValueChange={(value) => {
                  setValue('customer_id', value === 'none' ? null : value)
                  if (value && value !== 'none') {
                    setValue('customer_name', '')
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('shipments.selectCustomer')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- {t('common.noResults')} --</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code ? `${c.code} - ${c.name}` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!watchedCustomerId && (
            <div className="space-y-2">
              <Label htmlFor="customer_name">{t('shipments.customerNameFreeText')}</Label>
              <Input
                id="customer_name"
                {...register('customer_name')}
                placeholder={t('shipments.customerNamePlaceholder')}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ship_date">{t('shipments.shipDate')}</Label>
              <Input
                id="ship_date"
                type="date"
                {...register('ship_date')}
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
          <CardTitle>{t('shipments.lineItems')}</CardTitle>
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
          {errors.lines && 'message' in errors.lines && (
            <p className="text-sm text-red-600 mb-4">{errors.lines.message}</p>
          )}

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">{t('products.title')}</TableHead>
                  <TableHead className="w-[100px]">{t('stock.available')}</TableHead>
                  <TableHead className="w-[100px]">{t('common.quantity')}</TableHead>
                  <TableHead className="w-[120px]">{t('stock.lotNumber')}</TableHead>
                  <TableHead className="w-[140px]">{t('stock.expiryDate')}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const productId = watch(`lines.${index}.product_id`)
                  const available = getAvailableStock(productId)
                  const product = products.find((p) => p.id === productId)

                  return (
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
                        <span className={available > 0 ? 'text-green-600' : 'text-red-600'}>
                          {available} {product?.base_uom}
                        </span>
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
                            placeholder={t('stock.lotNumber')}
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
          {isSubmitting ? t('common.loading') : t('shipments.createShipment')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/shipments')}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
