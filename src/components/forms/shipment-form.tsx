'use client'

import { useMemo, useRef } from 'react'
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
import { createShipment, updateShipment } from '@/lib/actions/shipments'
import { useTranslation } from '@/lib/i18n'
import { DocumentUpload, type DocumentUploadHandle } from '@/components/documents/document-upload'
import type { Customer, Location, Product, InventoryBalance } from '@/types'

interface ShipmentFormProps {
  customers: Customer[]
  locations: Location[]
  products: Product[]
  stockBalances: InventoryBalance[]
  initialData?: {
    id: string
    location_id: string
    customer_id: string | null
    customer_name: string | null
    ship_date: string | null
    notes: string | null
    lines: { product_id: string; qty: number; lot_number: string | null; expiry_date: string | null }[]
  }
}

export function ShipmentForm({ customers, locations, products, stockBalances, initialData }: ShipmentFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const docUploadRef = useRef<DocumentUploadHandle>(null)
  const isEdit = !!initialData

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
    defaultValues: initialData
      ? {
          location_id: initialData.location_id,
          customer_id: initialData.customer_id || '',
          customer_name: initialData.customer_name || '',
          ship_date: initialData.ship_date || new Date().toISOString().split('T')[0],
          notes: initialData.notes || '',
          lines: initialData.lines.map((l) => ({
            product_id: l.product_id,
            qty: l.qty,
            lot_number: l.lot_number || '',
            expiry_date: l.expiry_date || '',
          })),
        }
      : {
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

  // Only show products that have stock in the selected source location
  const availableProducts = useMemo(() => {
    if (!watchedLocationId) return []
    const productIdsWithStock = new Set(
      stockBalances
        .filter((b) => b.location_id === watchedLocationId && b.qty_on_hand > 0)
        .map((b) => b.product_id)
    )
    return products.filter((p) => p.active && productIdsWithStock.has(p.id))
  }, [watchedLocationId, stockBalances, products])

  // Get total available stock for a product at selected location (sum of all lots)
  const getTotalStock = (productId: string) => {
    return stockBalances
      .filter((b) => b.product_id === productId && b.location_id === watchedLocationId)
      .reduce((sum, b) => sum + b.qty_on_hand, 0)
  }

  // Get all available lots/batches for a product at selected location
  const getAvailableLots = (productId: string) => {
    return stockBalances.filter(
      (b) => b.product_id === productId && b.location_id === watchedLocationId && b.qty_on_hand > 0
    )
  }

  // Get stock for a specific balance by ID
  const getLotStock = (balanceId: string) => {
    const balance = stockBalances.find((b) => b.id === balanceId)
    return balance?.qty_on_hand || 0
  }

  // Format lot display text
  const formatLotDisplay = (balance: InventoryBalance) => {
    const parts: string[] = []
    if (balance.lot_number) {
      parts.push(balance.lot_number)
    } else {
      parts.push(t('stock.noLot'))
    }
    if (balance.expiry_date) {
      parts.push(`${t('stock.expiry')}: ${balance.expiry_date}`)
    }
    const uom = products.find(p => p.id === balance.product_id)?.base_uom
    parts.push(`(${balance.qty_on_hand} ${uom ? t(`uom.${uom}`) : ''})`)
    return parts.join(' - ')
  }

  const onSubmit = async (data: ShipmentFormData) => {
    if (data.customer_name && !data.customer_id) {
      data.customer_id = null
    }

    try {
      const result = isEdit
        ? await updateShipment(initialData!.id, data)
        : await createShipment(data)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = (result as any)?.error
      if (err) {
        if (typeof err === 'object' && '_form' in err) {
          toast.error((err as { _form: string[] })._form?.[0])
        } else {
          toast.error(t('toast.validationError'))
        }
        return
      }
      toast.success(isEdit ? t('toast.shipmentUpdated') : t('toast.shipmentCreated'))
      if (!isEdit && (result as any)?.id) {
        await docUploadRef.current?.uploadQueuedFiles((result as any).id)
      }
      router.replace(isEdit ? `/shipments/${initialData!.id}` : '/shipments')
      router.refresh()
    } catch {
      toast.error(t('toast.errorOccurred'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? t('shipments.editShipment') : t('shipments.newShipment')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('shipments.shipFromLocation')} *</Label>
              <Select
                value={watch('location_id')}
                onValueChange={(value) => {
                  setValue('location_id', value)
                  // Clear product and lot selections when location changes
                  const currentLines = watch('lines')
                  currentLines.forEach((_, index) => {
                    setValue(`lines.${index}.product_id`, '')
                    setValue(`lines.${index}.lot_number`, '')
                    setValue(`lines.${index}.expiry_date`, '')
                  })
                }}
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
                  <TableHead className="w-[250px]">{t('products.title')}</TableHead>
                  <TableHead className="w-[280px]">{t('stock.lotBatch')}</TableHead>
                  <TableHead className="w-[140px]">{t('stock.available')}</TableHead>
                  <TableHead className="w-[100px]">{t('common.quantity')}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const productId = watch(`lines.${index}.product_id`)
                  const lotNumber = watch(`lines.${index}.lot_number`)
                  const expiryDate = watch(`lines.${index}.expiry_date`)
                  const product = products.find((p) => p.id === productId)
                  const availableLots = productId ? getAvailableLots(productId) : []
                  const totalStock = productId ? getTotalStock(productId) : 0

                  // Find the selected balance
                  const selectedBalance = stockBalances.find(
                    (b) =>
                      b.product_id === productId &&
                      b.location_id === watchedLocationId &&
                      (b.lot_number || '') === (lotNumber || '') &&
                      (b.expiry_date || '') === (expiryDate || '')
                  )
                  const lotStock = selectedBalance?.qty_on_hand || 0

                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Select
                          value={watch(`lines.${index}.product_id`)}
                          onValueChange={(value) => {
                            setValue(`lines.${index}.product_id`, value)
                            // Clear lot selection when product changes
                            setValue(`lines.${index}.lot_number`, '')
                            setValue(`lines.${index}.expiry_date`, '')
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.selectOption')} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProducts.map((p) => (
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
                        {productId && availableLots.length > 0 ? (
                          <Select
                            value={selectedBalance?.id || 'none'}
                            onValueChange={(balanceId) => {
                              if (balanceId === 'none') {
                                setValue(`lines.${index}.lot_number`, '')
                                setValue(`lines.${index}.expiry_date`, '')
                              } else {
                                const balance = stockBalances.find((b) => b.id === balanceId)
                                if (balance) {
                                  setValue(`lines.${index}.lot_number`, balance.lot_number || '')
                                  setValue(`lines.${index}.expiry_date`, balance.expiry_date || '')
                                }
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('shipments.selectLot')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-- {t('shipments.selectLot')} --</SelectItem>
                              {availableLots.map((balance) => (
                                <SelectItem key={balance.id} value={balance.id}>
                                  {formatLotDisplay(balance)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : productId ? (
                          <span className="text-gray-400 text-sm">{t('stock.noStockAvailable')}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className={totalStock > 0 ? 'text-blue-600' : 'text-red-600'}>
                            {t('common.total')}: {totalStock} {t(`uom.${product?.base_uom}`)}
                          </div>
                          {selectedBalance && (
                            <div className={lotStock > 0 ? 'text-green-600' : 'text-red-600'}>
                              {t('stock.lot')}: {lotStock} {t(`uom.${product?.base_uom}`)}
                            </div>
                          )}
                        </div>
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

      {!isEdit && <DocumentUpload ref={docUploadRef} entityType="shipment" entityId={null} />}

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : (isEdit ? t('shipments.updateShipment') : t('shipments.createShipment'))}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(isEdit ? `/shipments/${initialData!.id}` : '/shipments')}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
