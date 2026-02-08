import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { AdjustmentForm } from '@/components/forms/adjustment-form'
import { getTranslator } from '@/lib/i18n/server'

export default async function NewAdjustmentPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  // Get current user's tenant settings for currency
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('tenant:tenants(settings)')
    .eq('id', user?.id)
    .single()

  const currency = (userData?.tenant as { settings?: { default_currency?: string } })?.settings?.default_currency || 'USD'

  const [locationsResult, productsResult] = await Promise.all([
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/adjustments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adjustments.newAdjustment')}</h1>
          <p className="text-gray-600">{t('adjustments.newAdjustmentSubtitle')}</p>
        </div>
      </div>
      <AdjustmentForm
        locations={locationsResult.data || []}
        products={productsResult.data || []}
        currency={currency}
      />
    </div>
  )
}
