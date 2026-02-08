export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TransferForm } from '@/components/forms/transfer-form'
import { getTranslator } from '@/lib/i18n/server'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditTransferPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: transfer, error } = await supabase
    .from('transfers')
    .select(`
      *,
      lines:transfer_lines(
        id,
        product_id,
        qty,
        lot_number,
        expiry_date
      )
    `)
    .eq('id', id)
    .single()

  if (error || !transfer || transfer.status !== 'draft') {
    notFound()
  }

  const [locationsRes, productsRes, balancesRes] = await Promise.all([
    supabase.from('locations').select('*').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('sku'),
    supabase.from('calculated_stock').select('*'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/transfers/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('transfers.editTransfer')}</h1>
          <p className="text-gray-600">{transfer.transfer_number}</p>
        </div>
      </div>

      <TransferForm
        locations={locationsRes.data || []}
        products={productsRes.data || []}
        stockBalances={balancesRes.data || []}
        initialData={{
          id: transfer.id,
          from_location_id: transfer.from_location_id,
          to_location_id: transfer.to_location_id,
          notes: transfer.notes,
          lines: transfer.lines || [],
        }}
      />
    </div>
  )
}
