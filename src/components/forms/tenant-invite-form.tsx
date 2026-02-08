'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { toast } from 'sonner'
import { inviteUserToTenant } from '@/lib/actions/tenants'
import { Send } from 'lucide-react'

interface TenantInviteFormProps {
  tenantId: string
}

interface FormData {
  email: string
  role: string
}

const roles = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'readonly', label: 'Read Only' },
]

export function TenantInviteForm({ tenantId }: TenantInviteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    defaultValues: {
      email: '',
      role: 'staff',
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)

    try {
      const result = await inviteUserToTenant(tenantId, data)

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

      toast.success('Invitation sent successfully')
      reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 space-y-1">
        <Label htmlFor="email" className="sr-only">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email address',
            },
          })}
          placeholder="user@company.com"
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="w-full sm:w-40">
        <Label htmlFor="role" className="sr-only">
          Role
        </Label>
        <Select
          value={watch('role')}
          onValueChange={(value) => setValue('role', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        <Send className="mr-2 h-4 w-4" />
        {isSubmitting ? 'Sending...' : 'Send Invite'}
      </Button>
    </form>
  )
}
