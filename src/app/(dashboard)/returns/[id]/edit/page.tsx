export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ReturnForm } from '@/components/forms/return-form'
import { getTranslator } from '@/lib/i18n/server'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditReturnPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: returnDoc, error } = await supabase
    .from('returns')
    .select(`
      *,
      lines:return_lines(
        id,
        product_id,
        qty,
        lot_number,
        expiry_date
      )
    `)
    .eq('id', id)
    .single()

  if (error || !returnDoc || returnDoc.status !== 'draft') {
    notFound()
  }

  const [customersRes, suppliersRes, locationsRes, productsRes, balancesRes] = await Promise.all([
    supabase.from('customers').select('*').eq('active', true).order('name'),
    supabase.from('suppliers').select('*').eq('active', true).order('name'),
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
    supabase.from('calculated_stock').select('*'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/returns/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('returns.editReturn')}</h1>
          <p className="text-gray-600">{returnDoc.return_number}</p>
        </div>
      </div>

      <ReturnForm
        customers={customersRes.data || []}
        suppliers={suppliersRes.data || []}
        locations={locationsRes.data || []}
        products={productsRes.data || []}
        stockBalances={balancesRes.data || []}
        initialData={{
          id: returnDoc.id,
          return_type: returnDoc.return_type,
          location_id: returnDoc.location_id,
          partner_id: returnDoc.partner_id,
          partner_name: returnDoc.partner_name,
          reason: returnDoc.reason,
          notes: returnDoc.notes,
          lines: returnDoc.lines || [],
        }}
      />
    </div>
  )
}
