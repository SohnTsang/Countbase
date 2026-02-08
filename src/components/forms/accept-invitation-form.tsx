'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { acceptInvitation } from '@/lib/actions/invitations'
import { CheckCircle, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

interface AcceptInvitationFormTranslations {
  email: string
  fullName: string
  fullNamePlaceholder: string
  fullNameRequired: string
  fullNameMinLength: string
  password: string
  passwordPlaceholder: string
  passwordRequired: string
  passwordMinLength: string
  passwordHint: string
  confirmPassword: string
  confirmPasswordPlaceholder: string
  confirmPasswordRequired: string
  passwordsDoNotMatch: string
  createAccount: string
  creatingAccount: string
  alreadyHaveAccount: string
  signIn: string
  successTitle: string
  successDescription: string
  goToLogin: string
  accountCreatedSuccess: string
}

interface AcceptInvitationFormProps {
  token: string
  email: string
  translations: AcceptInvitationFormTranslations
}

interface FormData {
  name: string
  password: string
  confirmPassword: string
}

export function AcceptInvitationForm({ token, email, translations: t }: AcceptInvitationFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      password: '',
      confirmPassword: '',
    },
  })

  const password = watch('password')

  const onSubmit = async (data: FormData) => {
    if (data.password !== data.confirmPassword) {
      setError('confirmPassword', { message: t.passwordsDoNotMatch })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await acceptInvitation({
        token,
        name: data.name,
        password: data.password,
      })

      if (result.error) {
        if (typeof result.error === 'object') {
          Object.entries(result.error).forEach(([field, messages]) => {
            if (field === '_form') {
              toast.error(Array.isArray(messages) ? messages[0] : messages)
            } else if (field === 'name' || field === 'password') {
              setError(field, {
                message: Array.isArray(messages) ? messages[0] : messages,
              })
            }
          })
        }
        return
      }

      setIsSuccess(true)
      toast.success(t.accountCreatedSuccess)

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{t.successTitle}</h3>
        <p className="mt-2 text-sm text-gray-500">
          {t.successDescription}
        </p>
        <Link href="/login" className="mt-4 inline-block">
          <Button>{t.goToLogin}</Button>
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t.email}</Label>
        <Input id="email" type="email" value={email} disabled className="bg-gray-50" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{t.fullName} *</Label>
        <Input
          id="name"
          {...register('name', {
            required: t.fullNameRequired,
            minLength: { value: 2, message: t.fullNameMinLength },
          })}
          placeholder={t.fullNamePlaceholder}
          autoFocus
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t.password} *</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password', {
              required: t.passwordRequired,
              minLength: { value: 8, message: t.passwordMinLength },
            })}
            placeholder={t.passwordPlaceholder}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
        <p className="text-xs text-gray-500">{t.passwordHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t.confirmPassword} *</Label>
        <Input
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          {...register('confirmPassword', {
            required: t.confirmPasswordRequired,
            validate: (value) => value === password || t.passwordsDoNotMatch,
          })}
          placeholder={t.confirmPasswordPlaceholder}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t.creatingAccount : t.createAccount}
      </Button>

      <p className="text-center text-xs text-gray-500">
        {t.alreadyHaveAccount}{' '}
        <Link href="/login" className="text-emerald-600 hover:underline">
          {t.signIn}
        </Link>
      </p>
    </form>
  )
}
