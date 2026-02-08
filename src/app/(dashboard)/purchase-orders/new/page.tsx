import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { PurchaseOrderForm } from '@/components/forms/purchase-order-form'
import { getTranslator, getLocale } from '@/lib/i18n/server'

export default async function NewPurchaseOrderPage() {
  const supabase = await createClient()
  const t = await getTranslator()
  const locale = await getLocale()

  // Get current user's tenant settings for currency
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('tenant:tenants(settings)')
    .eq('id', user?.id)
    .single()

  const currency = (userData?.tenant as { settings?: { default_currency?: string } })?.settings?.default_currency || 'USD'

  const [suppliersRes, locationsRes, productsRes] = await Promise.all([
    supabase.from('suppliers').select('*').eq('active', true).order('name'),
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchase-orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('purchaseOrders.newOrder')}</h1>
          <p className="text-gray-600">{t('purchaseOrders.newOrderSubtitle')}</p>
        </div>
      </div>

      <PurchaseOrderForm
        suppliers={suppliersRes.data || []}
        locations={locationsRes.data || []}
        products={productsRes.data || []}
        currency={currency}
        locale={locale}
      />
    </div>
  )
}
