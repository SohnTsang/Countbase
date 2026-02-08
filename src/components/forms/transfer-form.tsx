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
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { createTransferSchema, type TransferFormData } from '@/lib/validations/transfer'
import { createTransfer, updateTransfer } from '@/lib/actions/transfers'
import { useTranslation } from '@/lib/i18n'
import { DocumentUpload, type DocumentUploadHandle } from '@/components/documents/document-upload'
import type { Location, Product, InventoryBalance } from '@/types'

interface TransferFormProps {
  locations: Location[]
  products: Product[]
  stockBalances: InventoryBalance[]
  initialData?: {
    id: string
    from_location_id: string
    to_location_id: string
    notes: string | null
    lines: { product_id: string; qty: number; lot_number: string | null; expiry_date: string | null }[]
  }
}

export function TransferForm({ locations, products, stockBalances, initialData }: TransferFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const docUploadRef = useRef<DocumentUploadHandle>(null)
  const isEdit = !!initialData

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
    defaultValues: initialData
      ? {
          from_location_id: initialData.from_location_id,
          to_location_id: initialData.to_location_id,
          notes: initialData.notes || '',
          lines: initialData.lines.map((l) => ({
            product_id: l.product_id,
            qty: l.qty,
            lot_number: l.lot_number || '',
            expiry_date: l.expiry_date || '',
          })),
        }
      : {
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

  // Only show products that have stock in the selected source location
  const availableProducts = useMemo(() => {
    if (!fromLocationId) return []
    const productIdsWithStock = new Set(
      stockBalances
        .filter((b) => b.location_id === fromLocationId && b.qty_on_hand > 0)
        .map((b) => b.product_id)
    )
    return products.filter((p) => p.active && productIdsWithStock.has(p.id))
  }, [fromLocationId, stockBalances, products])

  // Get total available stock for a product at selected location (sum of all lots)
  const getTotalStock = (productId: string) => {
    return stockBalances
      .filter((b) => b.product_id === productId && b.location_id === fromLocationId)
      .reduce((sum, b) => sum + b.qty_on_hand, 0)
  }

  // Get all available lots/batches for a product at selected location (deduplicated by ID)
  const getAvailableLots = (productId: string) => {
    const filtered = stockBalances.filter(
      (b) => b.product_id === productId && b.location_id === fromLocationId && b.qty_on_hand > 0
    )
    // Deduplicate by balance ID to prevent React key warnings
    const seen = new Set<string>()
    return filtered.filter((b) => {
      if (seen.has(b.id)) return false
      seen.add(b.id)
      return true
    })
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

  const onSubmit = async (data: TransferFormData) => {
    try {
      const result = isEdit
        ? await updateTransfer(initialData!.id, data)
        : await createTransfer(data)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = (result as any)?.error
      if (err) {
        if (typeof err === 'object' && '_form' in err) {
          toast.error((err as { _form: string[] })._form?.[0])
        } else if (typeof err === 'object') {
          Object.entries(err).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg) => toast.error(`${field}: ${msg}`))
            }
          })
        }
        return
      }

      toast.success(isEdit ? t('toast.transferUpdated') : t('toast.transferCreated'))
      if (!isEdit && (result as any)?.id) {
        await docUploadRef.current?.uploadQueuedFiles((result as any).id)
      }
      router.replace(isEdit ? `/transfers/${initialData!.id}` : '/transfers')
      router.refresh()
    } catch {
      toast.error(t('toast.errorOccurred'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? t('transfers.editTransfer') : t('transfers.transferDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('transfers.fromLocation')} *</Label>
              <Select
                value={watch('from_location_id')}
                onValueChange={(value) => {
                  setValue('from_location_id', value)
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
            <Textarea {...register('notes')} placeholder={t('common.optional')} rows={2} />
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
                      b.location_id === fromLocationId &&
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
                            {t('common.total')}: {totalStock} {product?.base_uom ? t(`uom.${product.base_uom}`) : ''}
                          </div>
                          {selectedBalance && (
                            <div className={lotStock > 0 ? 'text-green-600' : 'text-red-600'}>
                              {t('stock.lot')}: {lotStock} {product?.base_uom ? t(`uom.${product.base_uom}`) : ''}
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

      {!isEdit && <DocumentUpload ref={docUploadRef} entityType="transfer" entityId={null} />}

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : (isEdit ? t('transfers.updateTransfer') : t('transfers.createTransfer'))}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(isEdit ? `/transfers/${initialData!.id}` : '/transfers')}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
