import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { AdjustmentForm } from '@/components/forms/adjustment-form'
import { getTranslator } from '@/lib/i18n/server'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditAdjustmentPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('tenant:tenants(settings)')
    .eq('id', user?.id)
    .single()

  const currency = (userData?.tenant as { settings?: { default_currency?: string } })?.settings?.default_currency || 'USD'

  const { data: adjustment, error } = await supabase
    .from('adjustments')
    .select(`
      *,
      lines:adjustment_lines(
        id,
        product_id,
        qty,
        lot_number,
        expiry_date,
        unit_cost
      )
    `)
    .eq('id', id)
    .single()

  if (error || !adjustment || adjustment.status !== 'draft') {
    notFound()
  }

  const [locationsRes, productsRes] = await Promise.all([
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/adjustments/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adjustments.editAdjustment')}</h1>
          <p className="text-gray-600">{adjustment.adjustment_number}</p>
        </div>
      </div>

      <AdjustmentForm
        locations={locationsRes.data || []}
        products={productsRes.data || []}
        currency={currency}
        initialData={{
          id: adjustment.id,
          location_id: adjustment.location_id,
          reason: adjustment.reason,
          notes: adjustment.notes,
          lines: adjustment.lines || [],
        }}
      />
    </div>
  )
}
