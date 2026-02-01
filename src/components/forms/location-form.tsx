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
import { createLocationSchema, type LocationFormData } from '@/lib/validations/location'
import { createLocation, updateLocation } from '@/lib/actions/locations'
import { useTranslation } from '@/lib/i18n'
import type { Location } from '@/types'

interface LocationFormProps {
  location?: Location
  locations: Location[]
}

export function LocationForm({ location, locations }: LocationFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const isEdit = !!location

  const schema = useMemo(() => createLocationSchema(t), [t])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: location?.name || '',
      type: location?.type || 'warehouse',
      parent_id: location?.parent_id || null,
      active: location?.active ?? true,
    },
  })

  const onSubmit = async (data: LocationFormData) => {
    try {
      const result = isEdit
        ? await updateLocation(location.id, data)
        : await createLocation(data)

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

      toast.success(isEdit ? t('toast.locationUpdated') : t('toast.locationCreated'))
    } catch (error) {
      toast.error(t('toast.errorOccurred'))
    }
  }

  const parentOptions = locations.filter((l) => l.id !== location?.id)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('locations.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('locations.locationName')} *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder={t('locations.locationName')}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{t('locations.type')} *</Label>
              <Select
                value={watch('type')}
                onValueChange={(value: string) => setValue('type', value as 'warehouse' | 'store' | 'outlet')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse">{t('locations.warehouse')}</SelectItem>
                  <SelectItem value="store">{t('locations.store')}</SelectItem>
                  <SelectItem value="outlet">{t('locations.outlet')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_id">{t('categories.parentCategory')} ({t('common.optional')})</Label>
            <Select
              value={watch('parent_id') || ''}
              onValueChange={(value) => setValue('parent_id', value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('categories.noParent')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('categories.noParent')}</SelectItem>
                {parentOptions.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('common.active')}</Label>
              <p className="text-sm text-gray-500">
                {t('products.inactiveHint')}
              </p>
            </div>
            <Switch
              checked={watch('active')}
              onCheckedChange={(checked) => setValue('active', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : isEdit ? t('locations.updateLocation') : t('locations.createLocation')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/locations')}
        >
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
