'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
import { createUserSchema, createCreateUserSchema, type CreateUserFormData, type UserFormData } from '@/lib/validations/user'
import { createUser, updateUser } from '@/lib/actions/users'
import { useTranslation } from '@/lib/i18n'
import type { User, UserRole } from '@/types'

interface UserFormProps {
  user?: User
  isCurrentUser?: boolean
  assignableRoles: UserRole[]
  canEditUser?: boolean // Whether the current user can edit this user
}

export function UserForm({
  user,
  isCurrentUser = false,
  assignableRoles,
  canEditUser = true,
}: UserFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const isEdit = !!user

  const schema = useMemo(() => isEdit ? createUserSchema(t) : createCreateUserSchema(t), [t, isEdit])

  const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    admin: t('users.roleDescAdmin'),
    manager: t('users.roleDescManager'),
    staff: t('users.roleDescStaff'),
    readonly: t('users.roleDescReadonly'),
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      email: user?.email || '',
      name: user?.name || '',
      role: user?.role || 'staff',
      active: user?.active ?? true,
      password: '',
    },
  })

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      const result = isEdit
        ? await updateUser(user.id, data as UserFormData)
        : await createUser(data)

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

      toast.success(isEdit ? t('toast.userUpdated') : t('toast.userCreated'))
      router.replace('/users')
      router.refresh()
    } catch (error) {
      toast.error(t('common.errorOccurred'))
    }
  }

  // Check if the user's current role is editable by the current manager
  const isRoleEditable = !isCurrentUser && canEditUser && assignableRoles.includes(user?.role || 'staff')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? t('users.editUser') : t('users.newUser')}
          </h1>
          <p className="text-gray-600">
            {isEdit ? t('users.editUserSubtitle') : t('users.newUserSubtitle')}
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('users.userDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
          {!canEditUser && (
            <div className="rounded-md bg-yellow-50 p-4 mb-4">
              <p className="text-sm text-yellow-800">
                {t('users.viewOnlyNote')}
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('users.name')} *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder={t('users.namePlaceholder')}
                disabled={!canEditUser}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('users.email')} *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder={t('users.emailPlaceholder')}
                disabled={isEdit}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
              {isEdit && (
                <p className="text-sm text-gray-500">{t('users.emailCannotChange')}</p>
              )}
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">{t('users.password')} *</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder={t('users.passwordPlaceholder')}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">{t('users.role')} *</Label>
            <Select
              value={watch('role')}
              onValueChange={(value: string) => setValue('role', value as UserRole)}
              disabled={isCurrentUser || !canEditUser}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_DESCRIPTIONS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCurrentUser && (
              <p className="text-sm text-gray-500">{t('users.cannotChangeOwnRole')}</p>
            )}
            {!isCurrentUser && !canEditUser && (
              <p className="text-sm text-gray-500">{t('users.cannotChangeUserRole')}</p>
            )}
            {assignableRoles.length < 4 && canEditUser && (
              <p className="text-sm text-gray-500">
                {t('users.canOnlyAssignLimitedRoles')}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('users.active')}</Label>
              <p className="text-sm text-gray-500">
                {t('users.inactiveUsersHint')}
              </p>
            </div>
            <Switch
              checked={watch('active')}
              onCheckedChange={(checked) => setValue('active', checked)}
              disabled={isCurrentUser || !canEditUser}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        {canEditUser && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('users.saving') : isEdit ? t('users.updateUser') : t('users.createUser')}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/users')}
        >
          {canEditUser ? t('common.cancel') : t('common.back')}
        </Button>
        </div>
      </form>
    </div>
  )
}
