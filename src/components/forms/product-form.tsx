'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
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
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createProductSchema, type ProductFormData } from '@/lib/validations/product'
import { createProduct, updateProduct } from '@/lib/actions/products'
import { useTranslation } from '@/lib/i18n'
import type { Product, Category } from '@/types'

const UOM_KEYS = ['EA', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'BOX', 'PACK'] as const

interface ProductFormProps {
  product?: Product
  categories: Category[]
}

export function ProductForm({ product, categories }: ProductFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const isEdit = !!product

  const schema = useMemo(() => createProductSchema(t), [t])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      sku: product?.sku || '',
      name: product?.name || '',
      barcode: product?.barcode || '',
      category_id: product?.category_id || null,
      base_uom: product?.base_uom || 'EA',
      pack_uom_name: product?.pack_uom_name || '',
      pack_qty_in_base: product?.pack_qty_in_base || null,
      current_cost: product?.current_cost || 0,
      track_expiry: product?.track_expiry || false,
      track_lot: product?.track_lot || false,
      reorder_point: product?.reorder_point || 0,
      reorder_qty: product?.reorder_qty || 0,
      active: product?.active ?? true,
    },
  })

  const trackExpiry = watch('track_expiry')
  const trackLot = watch('track_lot')
  const active = watch('active')

  const onSubmit = async (data: ProductFormData) => {
    try {
      const result = isEdit
        ? await updateProduct(product.id, data)
        : await createProduct(data)

      if (result?.error) {
        if (typeof result.error === 'string') {
          toast.error(result.error)
        } else {
          Object.entries(result.error).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg) => toast.error(`${field}: ${msg}`))
            }
          })
        }
        return
      }

      toast.success(isEdit ? t('toast.productUpdated') : t('toast.productCreated'))
    } catch (error) {
      toast.error(t('toast.errorOccurred'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('products.basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">{t('products.sku')} *</Label>
              <Input
                id="sku"
                {...register('sku')}
                placeholder={t('products.skuPlaceholder')}
              />
              {errors.sku && (
                <p className="text-sm text-red-600">{errors.sku.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('products.name')} *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder={t('products.namePlaceholder')}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="barcode">{t('products.barcode')}</Label>
              <Input
                id="barcode"
                {...register('barcode')}
                placeholder={t('products.barcodePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">{t('products.category')}</Label>
              <Select
                value={watch('category_id') || ''}
                onValueChange={(value) => setValue('category_id', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.selectOption')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('common.noCategory')}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('products.unitsOfMeasure')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="base_uom">{t('products.baseUom')} *</Label>
              <Select
                value={watch('base_uom')}
                onValueChange={(value: string) => setValue('base_uom', value as typeof UOM_KEYS[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UOM_KEYS.map((uom) => (
                    <SelectItem key={uom} value={uom}>
                      {t(`uom.${uom}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pack_uom_name">{t('products.packUom')}</Label>
              <Input
                id="pack_uom_name"
                {...register('pack_uom_name')}
                placeholder={t('products.packUomPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pack_qty_in_base">{t('products.packQty')}</Label>
              <Input
                id="pack_qty_in_base"
                type="number"
                step="0.0001"
                {...register('pack_qty_in_base')}
                placeholder="e.g., 12"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {t('products.packUnitHint')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('products.costAndReorder')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current_cost">{t('products.currentCost')}</Label>
              <Input
                id="current_cost"
                type="number"
                step="0.0001"
                {...register('current_cost')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder_point">{t('products.reorderPoint')}</Label>
              <Input
                id="reorder_point"
                type="number"
                step="0.0001"
                {...register('reorder_point')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder_qty">{t('products.reorderQty')}</Label>
              <Input
                id="reorder_qty"
                type="number"
                step="0.0001"
                {...register('reorder_qty')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('products.trackingAndStatus')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('products.trackExpiry')}</Label>
              <p className="text-sm text-gray-500">
                {t('products.trackExpiryDesc')}
              </p>
            </div>
            <Switch
              checked={trackExpiry}
              onCheckedChange={(checked) => setValue('track_expiry', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('products.trackLot')}</Label>
              <p className="text-sm text-gray-500">
                {t('products.trackLotDesc')}
              </p>
            </div>
            <Switch
              checked={trackLot}
              onCheckedChange={(checked) => setValue('track_lot', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('common.active')}</Label>
              <p className="text-sm text-gray-500">
                {t('products.inactiveHint')}
              </p>
            </div>
            <Switch
              checked={active}
              onCheckedChange={(checked) => setValue('active', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : isEdit ? t('products.updateProduct') : t('products.createProduct')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/products')}
        >
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
