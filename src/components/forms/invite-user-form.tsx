'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { inviteUser } from '@/lib/actions/invitations'
import { useTranslation } from '@/lib/i18n'
import { Send } from 'lucide-react'
import type { UserRole } from '@/types'

interface InviteUserFormProps {
  assignableRoles: UserRole[]
  onSuccess?: () => void
}

interface FormData {
  email: string
  role: UserRole
}

export function InviteUserForm({ assignableRoles, onSuccess }: InviteUserFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const roleLabels: Record<UserRole, string> = {
    admin: t('users.roleDescAdmin'),
    manager: t('users.roleDescManager'),
    staff: t('users.roleDescStaff'),
    readonly: t('users.roleDescReadonly'),
  }

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
      role: assignableRoles[0] || 'staff',
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)

    try {
      const result = await inviteUser(data)

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

      toast.success(t('toast.invitationSent'))
      reset()
      router.refresh()
      onSuccess?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('users.inviteUser')}</CardTitle>
        <CardDescription>{t('users.inviteUserDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="invite-email" className="sr-only">
              {t('users.email')}
            </Label>
            <Input
              id="invite-email"
              type="email"
              {...register('email', {
                required: t('validation.required'),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t('validation.invalidEmail'),
                },
              })}
              placeholder={t('users.emailPlaceholder')}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1 sm:flex-initial">
              <Label htmlFor="invite-role" className="sr-only">
                {t('users.role')}
              </Label>
              <Select
                value={watch('role')}
                onValueChange={(value) => setValue('role', value as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? t('common.sending') : t('users.sendInvite')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
