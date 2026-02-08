import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { PurchaseOrderForm } from '@/components/forms/purchase-order-form'
import { getTranslator, getLocale } from '@/lib/i18n/server'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditPurchaseOrderPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const t = await getTranslator()
  const locale = await getLocale()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('tenant:tenants(settings)')
    .eq('id', user?.id)
    .single()

  const currency = (userData?.tenant as { settings?: { default_currency?: string } })?.settings?.default_currency || 'USD'

  const { data: po, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      lines:purchase_order_lines(
        id,
        product_id,
        qty_ordered,
        unit_cost
      )
    `)
    .eq('id', id)
    .single()

  if (error || !po || po.status !== 'draft') {
    notFound()
  }

  const [suppliersRes, locationsRes, productsRes] = await Promise.all([
    supabase.from('suppliers').select('*').eq('active', true).order('name'),
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/purchase-orders/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('purchaseOrders.editPO')}</h1>
          <p className="text-gray-600">{po.po_number}</p>
        </div>
      </div>

      <PurchaseOrderForm
        suppliers={suppliersRes.data || []}
        locations={locationsRes.data || []}
        products={productsRes.data || []}
        currency={currency}
        locale={locale}
        initialData={{
          id: po.id,
          supplier_id: po.supplier_id,
          location_id: po.location_id,
          order_date: po.order_date,
          expected_date: po.expected_date,
          notes: po.notes,
          lines: po.lines || [],
        }}
      />
    </div>
  )
}
