import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { TransfersTable } from '@/components/tables/transfers-table'
import { getTranslator } from '@/lib/i18n/server'

export default async function TransfersPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: transfers, error } = await supabase
    .from('transfers')
    .select(`
      *,
      from_location:locations!transfers_from_location_id_fkey(id, name),
      to_location:locations!transfers_to_location_id_fkey(id, name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-red-600">{t('errors.serverError')}: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('transfers.title')}</h1>
          <p className="text-gray-600">{t('transfers.subtitle')}</p>
        </div>
        <Link href="/transfers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('transfers.newTransfer')}
          </Button>
        </Link>
      </div>

      <TransfersTable data={transfers || []} />
    </div>
  )
}
