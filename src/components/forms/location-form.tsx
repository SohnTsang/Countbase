'use client'

import { useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createLocationSchema, type LocationFormData } from '@/lib/validations/location'
import { createLocation, updateLocation } from '@/lib/actions/locations'
import { useTranslation } from '@/lib/i18n'
import { DocumentUpload, type DocumentUploadHandle } from '@/components/documents/document-upload'
import type { Location } from '@/types'

interface LocationFormProps {
  location?: Location
  locations: Location[]
}

export function LocationForm({ location, locations }: LocationFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const isEdit = !!location
  const docUploadRef = useRef<DocumentUploadHandle>(null)

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
      is_parent: location?.is_parent || false,
      address: location?.address || '',
      active: location?.active ?? true,
    },
  })

  const onSubmit = async (data: LocationFormData) => {
    try {
      const result = isEdit
        ? await updateLocation(location.id, data)
        : await createLocation(data)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = (result as any)?.error
      if (err) {
        if (typeof err === 'string') {
          toast.error(err)
        } else {
          Object.entries(err).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg) => toast.error(`${field}: ${msg}`))
            }
          })
        }
        return
      }

      toast.success(isEdit ? t('toast.locationUpdated') : t('toast.locationCreated'))
      if (!isEdit && (result as any)?.id) {
        await docUploadRef.current?.uploadQueuedFiles((result as any).id)
      }
      router.replace('/locations')
      router.refresh()
    } catch (error) {
      toast.error(t('toast.errorOccurred'))
    }
  }

  const isParent = watch('is_parent')

  // Only show locations marked as "parent locations" in the dropdown
  // Also exclude current location if editing
  const parentOptions = locations.filter((l) =>
    l.is_parent && // Only locations marked as parent can be parents
    l.id !== location?.id // Exclude self when editing
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/locations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? t('locations.editLocation') : t('locations.newLocation')}
          </h1>
          <p className="text-gray-600">
            {isEdit ? t('locations.editLocationSubtitle') : t('locations.newLocationSubtitle')}
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('locations.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
                  <SelectTrigger id="type">
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
              <Label htmlFor="address">{t('locations.address')} ({t('common.optional')})</Label>
              <Textarea
                id="address"
                {...register('address')}
                placeholder={t('locations.addressPlaceholder')}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-3 rounded-lg border p-4">
              <Checkbox
                id="is_parent"
                checked={isParent}
                onCheckedChange={(checked) => {
                  setValue('is_parent', !!checked)
                  // If marking as parent, clear the parent_id (parent locations cannot have parents)
                  if (checked) {
                    setValue('parent_id', null)
                  }
                }}
              />
              <div className="space-y-1">
                <Label htmlFor="is_parent" className="cursor-pointer font-medium">
                  {t('locations.isParentLocation')}
                </Label>
                <p className="text-sm text-gray-500">
                  {t('locations.isParentLocationHint')}
                </p>
              </div>
            </div>

            {!isParent && (
              <div className="space-y-2">
                <Label htmlFor="parent_id">{t('locations.parentLocation')} ({t('common.optional')})</Label>
                <Select
                  value={watch('parent_id') || 'none'}
                  onValueChange={(value) => setValue('parent_id', value === 'none' ? null : value)}
                >
                  <SelectTrigger id="parent_id">
                    <SelectValue placeholder={t('locations.noParent')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('locations.noParent')}</SelectItem>
                    {parentOptions.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  {t('locations.parentHint')}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>{t('common.active')}</Label>
                <p className="text-sm text-gray-500">
                  {t('locations.inactiveHint')}
                </p>
              </div>
              <Switch
                checked={watch('active')}
                onCheckedChange={(checked) => setValue('active', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <DocumentUpload ref={docUploadRef} entityType="location" entityId={location?.id || null} />

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
    </div>
  )
}
