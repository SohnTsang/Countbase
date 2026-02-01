'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createCustomerSchema, type CustomerFormData } from '@/lib/validations/customer'
import { createCustomer, updateCustomer } from '@/lib/actions/customers'
import { useTranslation } from '@/lib/i18n'
import type { Customer } from '@/types'

interface CustomerFormProps {
  customer?: Customer
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const isEdit = !!customer

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

      if (result?.error) {
        if (typeof result.error === 'object') {
          Object.entries(result.error).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg) => toast.error(`${field}: ${msg}`))
            }
          })
        }
        return
      }

      toast.success(isEdit ? t('toast.customerUpdated') : t('toast.customerCreated'))
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('customers.address')}</Label>
            <Input {...register('address.street')} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{t('common.city')}</Label>
              <Input {...register('address.city')} />
            </div>
            <div className="space-y-2">
              <Label>{t('common.state')}</Label>
              <Input {...register('address.state')} />
            </div>
            <div className="space-y-2">
              <Label>{t('common.postalCode')}</Label>
              <Input {...register('address.postal_code')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('common.country')}</Label>
            <Input {...register('address.country')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('common.active')}</Label>
              <p className="text-sm text-gray-500">{t('products.inactiveHint')}</p>
            </div>
            <Switch checked={watch('active')} onCheckedChange={(c) => setValue('active', c)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : isEdit ? t('customers.updateCustomer') : t('customers.createCustomer')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/customers')}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
