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
import { createReturnSchema, type ReturnFormData } from '@/lib/validations/return'
import { createReturn, updateReturn } from '@/lib/actions/returns'
import { useTranslation } from '@/lib/i18n'
import { DocumentUpload, type DocumentUploadHandle } from '@/components/documents/document-upload'
import type { Customer, Supplier, Location, Product, InventoryBalance } from '@/types'

interface ReturnFormProps {
  customers: Customer[]
  suppliers: Supplier[]
  locations: Location[]
  products: Product[]
  stockBalances: InventoryBalance[]
  initialData?: {
    id: string
    return_type: 'customer' | 'supplier'
    location_id: string
    partner_id: string | null
    partner_name: string | null
    reason: string | null
    notes: string | null
    lines: { product_id: string; qty: number; lot_number: string | null; expiry_date: string | null }[]
  }
}

export function ReturnForm({ customers, suppliers, locations, products, stockBalances, initialData }: ReturnFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const docUploadRef = useRef<DocumentUploadHandle>(null)
  const isEdit = !!initialData

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
    defaultValues: initialData
      ? {
          return_type: initialData.return_type,
          location_id: initialData.location_id,
          partner_id: initialData.partner_id || '',
          partner_name: initialData.partner_name || '',
          reason: initialData.reason || '',
          notes: initialData.notes || '',
          lines: initialData.lines.map((l) => ({
            product_id: l.product_id,
            qty: l.qty,
            lot_number: l.lot_number || '',
            expiry_date: l.expiry_date || '',
          })),
        }
      : {
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
  const watchedLocationId = watch('location_id')

  const partners = watchedReturnType === 'customer' ? customers : suppliers
  const isSupplierReturn = watchedReturnType === 'supplier'

  // For supplier returns: only show products with stock at selected location
  const availableProducts = useMemo(() => {
    if (!isSupplierReturn || !watchedLocationId) return products
    const productIdsWithStock = new Set(
      stockBalances
        .filter((b) => b.location_id === watchedLocationId && b.qty_on_hand > 0)
        .map((b) => b.product_id)
    )
    return products.filter((p) => p.active && productIdsWithStock.has(p.id))
  }, [isSupplierReturn, watchedLocationId, stockBalances, products])

  // Get total available stock for a product at selected location
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

  const onSubmit = async (data: ReturnFormData) => {
    // Set partner name from selected partner
    if (data.partner_id) {
      const partner = partners.find((p) => p.id === data.partner_id)
      data.partner_name = partner?.name || null
    }

    try {
      const result = isEdit
        ? await updateReturn(initialData!.id, data)
        : await createReturn(data)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = (result as any)?.error
      if (err) {
        if (typeof err === 'object' && '_form' in err) {
          toast.error((err as { _form: string[] })._form?.[0])
        } else {
          toast.error(t('common.validationError'))
        }
        return
      }
      toast.success(isEdit ? t('toast.returnUpdated') : t('toast.returnCreated'))
      if (!isEdit && (result as any)?.id) {
        await docUploadRef.current?.uploadQueuedFiles((result as any).id)
      }
      router.replace(isEdit ? `/returns/${initialData!.id}` : '/returns')
      router.refresh()
    } catch (error) {
      toast.error(t('common.errorOccurred'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? t('returns.editReturn') : t('returns.newReturn')}</CardTitle>
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
                  // Clear product and lot selections when type changes
                  const currentLines = watch('lines')
                  currentLines.forEach((_, index) => {
                    setValue(`lines.${index}.product_id`, '')
                    setValue(`lines.${index}.lot_number`, '')
                    setValue(`lines.${index}.expiry_date`, '')
                  })
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
                onValueChange={(value) => {
                  setValue('location_id', value)
                  // Clear product and lot selections when location changes (for supplier returns)
                  if (isSupplierReturn) {
                    const currentLines = watch('lines')
                    currentLines.forEach((_, index) => {
                      setValue(`lines.${index}.product_id`, '')
                      setValue(`lines.${index}.lot_number`, '')
                      setValue(`lines.${index}.expiry_date`, '')
                    })
                  }
                }}
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
                  <TableHead className="w-[250px]">{t('products.product')}</TableHead>
                  {isSupplierReturn ? (
                    <>
                      <TableHead className="w-[280px]">{t('stock.lotBatch')}</TableHead>
                      <TableHead className="w-[140px]">{t('stock.available')}</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="w-[120px]">{t('purchaseOrders.lot')}</TableHead>
                      <TableHead className="w-[140px]">{t('purchaseOrders.expiry')}</TableHead>
                    </>
                  )}
                  <TableHead className="w-[100px]">{t('returns.qty')}</TableHead>
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

                  // Find the selected balance for supplier returns
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
                            <SelectValue placeholder={t('cycleCounts.selectProduct')} />
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

                      {isSupplierReturn ? (
                        <>
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
                        </>
                      ) : (
                        <>
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
                        </>
                      )}

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

      {!isEdit && <DocumentUpload ref={docUploadRef} entityType="return" entityId={null} />}

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('returns.creating') : (isEdit ? t('returns.updateReturn') : t('returns.createReturn'))}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(isEdit ? `/returns/${initialData!.id}` : '/returns')}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
