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
import { createCustomerSchema, type CustomerFormData } from '@/lib/validations/customer'
import { createCustomer, updateCustomer } from '@/lib/actions/customers'
import { useTranslation } from '@/lib/i18n'
import { DocumentUpload, type DocumentUploadHandle } from '@/components/documents/document-upload'
import type { Customer } from '@/types'

interface CustomerFormProps {
  customer?: Customer
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const isEdit = !!customer
  const docUploadRef = useRef<DocumentUploadHandle>(null)

  const schema = useMemo(() => createCustomerSchema(t), [t])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      code: customer?.code || '',
      name: customer?.name || '',
      contact_name: customer?.contact_name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      address: {
        street: (customer?.address as Record<string, string>)?.street || '',
        city: (customer?.address as Record<string, string>)?.city || '',
        state: (customer?.address as Record<string, string>)?.state || '',
        postal_code: (customer?.address as Record<string, string>)?.postal_code || '',
        country: (customer?.address as Record<string, string>)?.country || '',
      },
      active: customer?.active ?? true,
    },
  })

  const onSubmit = async (data: CustomerFormData) => {
    try {
      const result = isEdit
        ? await updateCustomer(customer.id, data)
        : await createCustomer(data)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = (result as any)?.error
      if (err) {
        if (typeof err === 'object') {
          Object.entries(err).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg) => toast.error(`${field}: ${msg}`))
            }
          })
        }
        return
      }

      toast.success(isEdit ? t('toast.customerUpdated') : t('toast.customerCreated'))
      if (!isEdit && (result as any)?.id) {
        await docUploadRef.current?.uploadQueuedFiles((result as any).id)
      }
      router.replace('/customers')
      router.refresh()
    } catch (error) {
      toast.error(t('toast.errorOccurred'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? t('customers.editCustomer') : t('customers.newCustomer')}
          </h1>
          <p className="text-gray-600">
            {isEdit ? t('customers.editCustomerSubtitle') : t('customers.newCustomerSubtitle')}
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('customers.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">{t('customers.customerCode')}</Label>
                <Input id="code" {...register('code')} placeholder={t('customers.codePlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{t('customers.customerName')} *</Label>
                <Input id="name" {...register('name')} placeholder={t('customers.namePlaceholder')} />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_name">{t('customers.contactName')}</Label>
                <Input id="contact_name" {...register('contact_name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('customers.email')}</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('customers.phone')}</Label>
              <Input id="phone" {...register('phone')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('customers.address')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="street">{t('customers.address')}</Label>
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
                <p className="text-sm text-gray-500">{t('customers.inactiveHint')}</p>
              </div>
              <Switch checked={watch('active')} onCheckedChange={(c) => setValue('active', c)} />
            </div>
          </CardContent>
        </Card>

        <DocumentUpload ref={docUploadRef} entityType="customer" entityId={customer?.id || null} />

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : isEdit ? t('customers.updateCustomer') : t('customers.createCustomer')}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/customers')}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
