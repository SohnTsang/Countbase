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
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createSupplierSchema, type SupplierFormData } from '@/lib/validations/supplier'
import { createSupplier, updateSupplier } from '@/lib/actions/suppliers'
import { useTranslation } from '@/lib/i18n'
import { DocumentUpload, type DocumentUploadHandle } from '@/components/documents/document-upload'
import type { Supplier } from '@/types'

interface SupplierFormProps {
  supplier?: Supplier
}

export function SupplierForm({ supplier }: SupplierFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const isEdit = !!supplier
  const docUploadRef = useRef<DocumentUploadHandle>(null)

  const schema = useMemo(() => createSupplierSchema(t), [t])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      code: supplier?.code || '',
      name: supplier?.name || '',
      contact_name: supplier?.contact_name || '',
      email: supplier?.email || '',
      phone: supplier?.phone || '',
      address: {
        street: (supplier?.address as Record<string, string>)?.street || '',
        city: (supplier?.address as Record<string, string>)?.city || '',
        state: (supplier?.address as Record<string, string>)?.state || '',
        postal_code: (supplier?.address as Record<string, string>)?.postal_code || '',
        country: (supplier?.address as Record<string, string>)?.country || '',
      },
      active: supplier?.active ?? true,
    },
  })

  const onSubmit = async (data: SupplierFormData) => {
    try {
      const result = isEdit
        ? await updateSupplier(supplier.id, data)
        : await createSupplier(data)

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

      toast.success(isEdit ? t('toast.supplierUpdated') : t('toast.supplierCreated'))
      if (!isEdit && (result as any)?.id) {
        await docUploadRef.current?.uploadQueuedFiles((result as any).id)
      }
      router.replace('/suppliers')
      router.refresh()
    } catch (error) {
      toast.error(t('toast.errorOccurred'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/suppliers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? t('suppliers.editSupplier') : t('suppliers.newSupplier')}
          </h1>
          <p className="text-gray-600">
            {isEdit ? t('suppliers.editSupplierSubtitle') : t('suppliers.newSupplierSubtitle')}
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('suppliers.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">{t('suppliers.supplierCode')}</Label>
                <Input
                  id="code"
                  {...register('code')}
                  placeholder={t('suppliers.codePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t('suppliers.supplierName')} *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder={t('suppliers.namePlaceholder')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_name">{t('suppliers.contactName')}</Label>
                <Input
                  id="contact_name"
                  {...register('contact_name')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('suppliers.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('suppliers.phone')}</Label>
              <Input
                id="phone"
                {...register('phone')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('suppliers.address')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="street">{t('suppliers.address')}</Label>
              <Input
                id="street"
                {...register('address.street')}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">{t('common.city')}</Label>
                <Input
                  id="city"
                  {...register('address.city')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">{t('common.state')}</Label>
                <Input
                  id="state"
                  {...register('address.state')}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postal_code">{t('common.postalCode')}</Label>
                <Input
                  id="postal_code"
                  {...register('address.postal_code')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">{t('common.country')}</Label>
                <Input
                  id="country"
                  {...register('address.country')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('common.status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('common.active')}</Label>
                <p className="text-sm text-gray-500">
                  {t('suppliers.inactiveHint')}
                </p>
              </div>
              <Switch
                checked={watch('active')}
                onCheckedChange={(checked) => setValue('active', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <DocumentUpload ref={docUploadRef} entityType="supplier" entityId={supplier?.id || null} />

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : isEdit ? t('suppliers.updateSupplier') : t('suppliers.createSupplier')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/suppliers')}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
