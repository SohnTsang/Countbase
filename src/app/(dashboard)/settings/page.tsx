import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LogoutButton } from '@/components/logout-button'
import { ProfileForm } from '@/components/forms/profile-form'
import { OrganizationForm } from '@/components/forms/organization-form'
import { LanguageSelector } from '@/components/forms/language-selector'
import { ClipboardList } from 'lucide-react'
import { getTranslator } from '@/lib/i18n/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('*, tenant:tenants(*)')
    .eq('id', user?.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600">{t('settings.subtitle')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.account')}</CardTitle>
            <CardDescription>{t('settings.accountDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm text-gray-500">{t('users.email')}</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-500">{t('users.name')}</Label>
                <ProfileForm currentName={userData?.name || ''} />
              </div>
              <p className="font-medium">{userData?.name || '-'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-500">{t('users.role')}</Label>
              <p className="font-medium capitalize">{userData?.role || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{t('settings.organization')}</CardTitle>
              <CardDescription>{t('settings.organizationDesc')}</CardDescription>
            </div>
            {userData?.role === 'admin' && (
              <OrganizationForm
                currentName={userData?.tenant?.name || ''}
                currentCurrency={userData?.tenant?.settings?.default_currency || 'USD'}
                requireAdjustmentApproval={userData?.tenant?.settings?.require_adjustment_approval || false}
              />
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm text-gray-500">{t('settings.organizationName')}</Label>
              <p className="font-medium">{userData?.tenant?.name || '-'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-500">{t('settings.defaultCurrency')}</Label>
              <p className="font-medium">{userData?.tenant?.settings?.default_currency || 'USD'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-500">{t('settings.requireApproval')}</Label>
              <p className="font-medium">
                {userData?.tenant?.settings?.require_adjustment_approval ? t('common.yes') : t('common.no')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {(userData?.role === 'admin' || userData?.role === 'manager') && (
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.auditLogs')}</CardTitle>
            <CardDescription>{t('settings.auditLogsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/audit-logs">
              <Button variant="outline">
                <ClipboardList className="h-4 w-4 mr-2" />
                {t('settings.viewAuditLogs')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language')}</CardTitle>
          <CardDescription>{t('settings.languageDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSelector />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.session')}</CardTitle>
          <CardDescription>{t('settings.sessionDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  )
}
