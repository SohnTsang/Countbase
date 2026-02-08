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
import { createCycleCountSchema, type CycleCountFormData } from '@/lib/validations/cycle-count'
import { createCycleCount, updateCycleCount } from '@/lib/actions/cycle-counts'
import { useTranslation } from '@/lib/i18n'
import { DocumentUpload, type DocumentUploadHandle } from '@/components/documents/document-upload'
import type { Location, Product, InventoryBalance } from '@/types'

interface CycleCountFormProps {
  locations: Location[]
  products: Product[]
  stockBalances: InventoryBalance[]
  initialData?: {
    id: string
    location_id: string
    count_date: string
    notes: string | null
    lines: { product_id: string; lot_number: string | null; expiry_date: string | null }[]
  }
}

export function CycleCountForm({ locations, products, stockBalances, initialData }: CycleCountFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const docUploadRef = useRef<DocumentUploadHandle>(null)
  const isEdit = !!initialData

  const schema = useMemo(() => createCycleCountSchema(t), [t])

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CycleCountFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: initialData
      ? {
          location_id: initialData.location_id,
          count_date: initialData.count_date,
          notes: initialData.notes || '',
          lines: initialData.lines.map((l) => ({
            product_id: l.product_id,
            system_qty: 0,
            counted_qty: null,
            lot_number: l.lot_number || '',
            expiry_date: l.expiry_date || '',
          })),
        }
      : {
          location_id: '',
          count_date: new Date().toISOString().split('T')[0],
          notes: '',
          lines: [{ product_id: '', system_qty: 0, counted_qty: null, lot_number: '', expiry_date: '' }],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  })

  const locationId = watch('location_id')
  const activeLocations = locations.filter((l) => l.active)

  // Only show products that have stock in the selected location (like transfer form)
  const availableProducts = useMemo(() => {
    if (!locationId) return []
    const productIdsWithStock = new Set(
      stockBalances
        .filter((b) => b.location_id === locationId && Number(b.qty_on_hand) > 0)
        .map((b) => b.product_id)
    )
    return products.filter((p) => p.active && productIdsWithStock.has(p.id))
  }, [locationId, stockBalances, products])

  // Get all available lots/batches for a product at selected location (deduplicated)
  const getAvailableLots = (productId: string) => {
    const filtered = stockBalances.filter(
      (b) => b.product_id === productId && b.location_id === locationId && Number(b.qty_on_hand) > 0
    )
    // Deduplicate by composite key (lot_number + expiry_date) to prevent React key warnings
    const seen = new Set<string>()
    return filtered.filter((b) => {
      const key = `${b.lot_number || ''}-${b.expiry_date || ''}`
      if (seen.has(key)) return false
      seen.add(key)
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
    parts.push(`(${Number(balance.qty_on_hand) || 0} ${uom ? t(`uom.${uom}`) : ''})`)
    return parts.join(' - ')
  }

  const onSubmit = async (data: CycleCountFormData) => {
    try {
      const result = isEdit
        ? await updateCycleCount(initialData!.id, data)
        : await createCycleCount(data)

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
      toast.success(isEdit ? t('toast.cycleCountUpdated') : t('toast.cycleCountCreated'))
      if (!isEdit && (result as any)?.id) {
        await docUploadRef.current?.uploadQueuedFiles((result as any).id)
      }
      router.replace(isEdit ? `/cycle-counts/${initialData!.id}` : '/cycle-counts')
      router.refresh()
    } catch (error) {
      toast.error(t('common.errorOccurred'))
    }
  }

  // Check if product dropdown should be disabled
  const isProductDropdownDisabled = !locationId || availableProducts.length === 0

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? t('cycleCounts.editCount') : t('cycleCounts.countDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('stock.location')} *</Label>
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
                    setValue(`lines.${index}.system_qty`, 0)
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('cycleCounts.selectLocation')} />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location_id && (
                <p className="text-sm text-red-600">{errors.location_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="count_date">{t('cycleCounts.countDate')} *</Label>
              <Input
                id="count_date"
                type="date"
                {...register('count_date')}
              />
              {errors.count_date && (
                <p className="text-sm text-red-600">{errors.count_date.message}</p>
              )}
            </div>
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
          <CardTitle>{t('cycleCounts.productsToCount')}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ product_id: '', system_qty: 0, counted_qty: null, lot_number: '', expiry_date: '' })}
            disabled={isProductDropdownDisabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('cycleCounts.addProduct')}
          </Button>
        </CardHeader>
        <CardContent>
          {errors.lines && 'message' in errors.lines && (
            <p className="text-sm text-red-600 mb-4">{errors.lines.message}</p>
          )}

          {!locationId && (
            <p className="text-sm text-muted-foreground mb-4">
              {t('cycleCounts.selectLocationFirst')}
            </p>
          )}

          {locationId && availableProducts.length === 0 && (
            <p className="text-sm text-orange-600 mb-4">
              {t('stock.noStockAvailable')}
            </p>
          )}

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">{t('products.product')}</TableHead>
                  <TableHead className="w-[280px]">{t('stock.lotBatch')}</TableHead>
                  <TableHead className="w-[120px] text-right">{t('cycleCounts.systemQty')}</TableHead>
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
                  const systemQty = watch(`lines.${index}.system_qty`)

                  // Find the selected balance
                  const selectedBalance = stockBalances.find(
                    (b) =>
                      b.product_id === productId &&
                      b.location_id === locationId &&
                      (b.lot_number || '') === (lotNumber || '') &&
                      (b.expiry_date || '') === (expiryDate || '')
                  )

                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Select
                          value={watch(`lines.${index}.product_id`) || undefined}
                          onValueChange={(value) => {
                            setValue(`lines.${index}.product_id`, value)
                            // Clear lot selection and system qty when product changes
                            setValue(`lines.${index}.lot_number`, '')
                            setValue(`lines.${index}.expiry_date`, '')
                            setValue(`lines.${index}.system_qty`, 0)
                          }}
                          disabled={isProductDropdownDisabled}
                        >
                          <SelectTrigger className={isProductDropdownDisabled ? 'opacity-50 cursor-not-allowed' : 'data-[placeholder]:text-foreground'}>
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
                      <TableCell>
                        {productId && availableLots.length > 0 ? (
                          <Select
                            value={(() => {
                              if (!selectedBalance) return undefined
                              const idx = availableLots.findIndex(
                                (b) => (b.lot_number || '') === (lotNumber || '') && (b.expiry_date || '') === (expiryDate || '')
                              )
                              return idx >= 0 ? idx.toString() : undefined
                            })()}
                            onValueChange={(lotIdx) => {
                              const balance = availableLots[parseInt(lotIdx, 10)]
                              if (balance) {
                                setValue(`lines.${index}.lot_number`, balance.lot_number || '')
                                setValue(`lines.${index}.expiry_date`, balance.expiry_date || '')
                                setValue(`lines.${index}.system_qty`, Number(balance.qty_on_hand) || 0)
                              }
                            }}
                          >
                            <SelectTrigger className="data-[placeholder]:text-foreground">
                              <SelectValue placeholder={t('shipments.selectLot')} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLots.map((balance, lotIndex) => (
                                <SelectItem key={lotIndex} value={lotIndex.toString()}>
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
                      <TableCell className="text-right">
                        <span className={systemQty > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                          {systemQty} {product?.base_uom ? t(`uom.${product.base_uom}`) : ''}
                        </span>
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

          <p className="text-sm text-muted-foreground mt-4">
            {t('cycleCounts.systemQtyNote')}
          </p>
        </CardContent>
      </Card>

      {!isEdit && <DocumentUpload ref={docUploadRef} entityType="cycle_count" entityId={null} />}

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting || isProductDropdownDisabled}>
          {isSubmitting ? t('cycleCounts.creating') : (isEdit ? t('cycleCounts.updateCount') : t('cycleCounts.createCycleCount'))}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(isEdit ? `/cycle-counts/${initialData!.id}` : '/cycle-counts')}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
