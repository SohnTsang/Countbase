import { Suspense } from 'react'
import { AcceptInvitationForm } from '@/components/forms/accept-invitation-form'
import { getInvitationByToken } from '@/lib/actions/invitations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Building2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getMessages } from '@/lib/i18n/get-messages'
import { type Locale, defaultLocale, isValidLocale } from '@/lib/i18n/config'

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let result: unknown = obj
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      return path
    }
  }
  return typeof result === 'string' ? result : path
}

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

async function AcceptInvitationContent({ token }: { token: string }) {
  const { invitation, locale: tenantLocale, error } = await getInvitationByToken(token)

  const locale: Locale = tenantLocale && isValidLocale(tenantLocale) ? tenantLocale : defaultLocale
  const messages = await getMessages(locale)
  const t = (key: string, params?: Record<string, string>) => {
    let text = getNestedValue(messages as Record<string, unknown>, key)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v)
      })
    }
    return text
  }

  if (error || !invitation) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>{t('acceptInvitation.invalidTitle')}</CardTitle>
          <CardDescription>
            {t('acceptInvitation.invalidDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-gray-500 mb-4">
            {t('acceptInvitation.invalidHint')}
          </p>
          <Link href="/login">
            <Button variant="outline">{t('acceptInvitation.goToLogin')}</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const tenant = invitation.tenant as { name: string } | undefined
  const orgName = tenant?.name || 'Organization'

  // Build translations object to pass to client form
  const formTranslations = {
    email: t('acceptInvitation.email'),
    role: t('acceptInvitation.role'),
    fullName: t('acceptInvitation.fullName'),
    fullNamePlaceholder: t('acceptInvitation.fullNamePlaceholder'),
    fullNameRequired: t('acceptInvitation.fullNameRequired'),
    fullNameMinLength: t('acceptInvitation.fullNameMinLength'),
    password: t('acceptInvitation.password'),
    passwordPlaceholder: t('acceptInvitation.passwordPlaceholder'),
    passwordRequired: t('acceptInvitation.passwordRequired'),
    passwordMinLength: t('acceptInvitation.passwordMinLength'),
    passwordHint: t('acceptInvitation.passwordHint'),
    confirmPassword: t('acceptInvitation.confirmPassword'),
    confirmPasswordPlaceholder: t('acceptInvitation.confirmPasswordPlaceholder'),
    confirmPasswordRequired: t('acceptInvitation.confirmPasswordRequired'),
    passwordsDoNotMatch: t('acceptInvitation.passwordsDoNotMatch'),
    createAccount: t('acceptInvitation.createAccount'),
    creatingAccount: t('acceptInvitation.creatingAccount'),
    alreadyHaveAccount: t('acceptInvitation.alreadyHaveAccount'),
    signIn: t('acceptInvitation.signIn'),
    successTitle: t('acceptInvitation.successTitle'),
    successDescription: t('acceptInvitation.successDescription'),
    goToLogin: t('acceptInvitation.goToLogin'),
    accountCreatedSuccess: t('acceptInvitation.accountCreatedSuccess'),
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <Building2 className="h-6 w-6 text-emerald-600" />
        </div>
        <CardTitle>{t('acceptInvitation.title')}</CardTitle>
        <CardDescription>
          {t('acceptInvitation.description', { organization: orgName })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t('acceptInvitation.email')}</span>
            <span className="font-medium">{invitation.email}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">{t('acceptInvitation.role')}</span>
            <span className="font-medium capitalize">{invitation.role}</span>
          </div>
        </div>
        <AcceptInvitationForm token={token} email={invitation.email} translations={formTranslations} />
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-6 w-32 mx-auto bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-48 mx-auto mt-2 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AcceptInvitationPage({ searchParams }: PageProps) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    // For missing token, use default locale since we don't know the tenant
    const messages = await getMessages(defaultLocale)
    const t = (key: string) => getNestedValue(messages as Record<string, unknown>, key)

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>{t('acceptInvitation.missingTokenTitle')}</CardTitle>
            <CardDescription>
              {t('acceptInvitation.missingTokenDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              {t('acceptInvitation.missingTokenHint')}
            </p>
            <Link href="/login">
              <Button variant="outline">{t('acceptInvitation.goToLogin')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<LoadingSkeleton />}>
        <AcceptInvitationContent token={token} />
      </Suspense>
    </div>
  )
}
