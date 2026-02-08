'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createTenant, updateTenant } from '@/lib/actions/tenants'
import type { Tenant } from '@/types'

interface TenantFormProps {
  tenant?: Tenant
  userCount?: number
}

interface FormData {
  name: string
  max_users: number
  admin_email?: string
}

export function TenantForm({ tenant, userCount = 0 }: TenantFormProps) {
  const router = useRouter()
  const isEdit = !!tenant
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    defaultValues: {
      name: tenant?.name || '',
      max_users: tenant?.max_users || 10,
      admin_email: '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)

    try {
      if (isEdit) {
        const result = await updateTenant(tenant.id, {
          name: data.name,
          max_users: data.max_users,
        })

        if (result.error) {
          if (typeof result.error === 'object') {
            Object.entries(result.error).forEach(([field, messages]) => {
              if (field === '_form') {
                toast.error(Array.isArray(messages) ? messages[0] : messages)
              } else {
                setError(field as keyof FormData, {
                  message: Array.isArray(messages) ? messages[0] : messages,
                })
              }
            })
          }
          return
        }

        toast.success('Organization updated successfully')
        router.push(`/admin/tenants/${tenant.id}`)
      } else {
        if (!data.admin_email) {
          setError('admin_email', { message: 'Admin email is required' })
          return
        }

        const result = await createTenant({
          name: data.name,
          max_users: data.max_users,
          admin_email: data.admin_email,
        })

        if (result.error) {
          if (typeof result.error === 'object') {
            Object.entries(result.error).forEach(([field, messages]) => {
              if (field === '_form') {
                toast.error(Array.isArray(messages) ? messages[0] : messages)
              } else {
                setError(field as keyof FormData, {
                  message: Array.isArray(messages) ? messages[0] : messages,
                })
              }
            })
          }
          return
        }

        toast.success('Organization created and invitation sent')
        router.push('/admin/tenants')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={isEdit ? `/admin/tenants/${tenant?.id}` : '/admin/tenants'}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Organization' : 'New Organization'}
          </h1>
          <p className="text-gray-600">
            {isEdit
              ? 'Update organization details'
              : 'Create a new organization and invite the first admin'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Basic information about the organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                placeholder="e.g., Acme Corporation"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_users">Maximum Users *</Label>
              <Input
                id="max_users"
                type="number"
                min={isEdit ? userCount : 1}
                max={1000}
                {...register('max_users', {
                  required: 'Max users is required',
                  valueAsNumber: true,
                  min: {
                    value: isEdit ? userCount : 1,
                    message: isEdit
                      ? `Cannot be less than current user count (${userCount})`
                      : 'Must be at least 1',
                  },
                })}
              />
              {errors.max_users && (
                <p className="text-sm text-red-600">{errors.max_users.message}</p>
              )}
              <p className="text-sm text-gray-500">
                The maximum number of users this organization can have
              </p>
            </div>
          </CardContent>
        </Card>

        {!isEdit && (
          <Card>
            <CardHeader>
              <CardTitle>First Administrator</CardTitle>
              <CardDescription>
                An invitation email will be sent to this address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin_email">Admin Email *</Label>
                <Input
                  id="admin_email"
                  type="email"
                  {...register('admin_email', {
                    required: 'Admin email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Invalid email address',
                    },
                  })}
                  placeholder="admin@company.com"
                />
                {errors.admin_email && (
                  <p className="text-sm text-red-600">{errors.admin_email.message}</p>
                )}
                <p className="text-sm text-gray-500">
                  This person will receive an invitation to set up their account as the organization admin
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit
                ? 'Saving...'
                : 'Creating...'
              : isEdit
              ? 'Save Changes'
              : 'Create Organization'}
          </Button>
          <Link href={isEdit ? `/admin/tenants/${tenant?.id}` : '/admin/tenants'}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
