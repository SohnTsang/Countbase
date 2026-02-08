import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ShipmentsTable } from '@/components/tables/shipments-table'
import { getTranslator } from '@/lib/i18n/server'

export default async function ShipmentsPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: shipments, error } = await supabase
    .from('shipments')
    .select(`
      *,
      customer:customers(id, name, code),
      location:locations(id, name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-red-600">{t('errors.serverError')}: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('shipments.title')}</h1>
          <p className="text-gray-600">{t('shipments.subtitle')}</p>
        </div>
        <Link href="/shipments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('shipments.newShipment')}
          </Button>
        </Link>
      </div>

      <ShipmentsTable data={shipments || []} />
    </div>
  )
}
