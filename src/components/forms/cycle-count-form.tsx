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
import { createCycleCountSchema, type CycleCountFormData } from '@/lib/validations/cycle-count'
import { createCycleCount } from '@/lib/actions/cycle-counts'
import { useTranslation } from '@/lib/i18n'
import type { Location, Product } from '@/types'

interface CycleCountFormProps {
  locations: Location[]
  products: Product[]
}

export function CycleCountForm({ locations, products }: CycleCountFormProps) {
  const router = useRouter()
  const { t } = useTranslation()

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
    defaultValues: {
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

  const onSubmit = async (data: CycleCountFormData) => {
    try {
      const result = await createCycleCount(data)

      if (result?.error) {
        if (typeof result.error === 'object' && '_form' in result.error) {
          toast.error((result.error as { _form: string[] })._form?.[0])
        } else {
          toast.error(t('common.validationError'))
        }
        return
      }
      toast.success(t('toast.cycleCountCreated'))
    } catch (error) {
      toast.error(t('common.errorOccurred'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('cycleCounts.newCycleCount')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('cycleCounts.addProduct')}
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
                  <TableHead className="w-[350px]">{t('products.product')}</TableHead>
                  <TableHead className="w-[120px]">{t('cycleCounts.lotOptional')}</TableHead>
                  <TableHead className="w-[140px]">{t('cycleCounts.expiryOptional')}</TableHead>
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

          <p className="text-sm text-muted-foreground mt-4">
            {t('cycleCounts.systemQtyNote')}
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('cycleCounts.creating') : t('cycleCounts.createCycleCount')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/cycle-counts')}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
