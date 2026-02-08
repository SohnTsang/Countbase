import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AdjustmentsTable } from '@/components/tables/adjustments-table'
import { getTranslator } from '@/lib/i18n/server'

export default async function AdjustmentsPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: adjustments, error } = await supabase
    .from('adjustments')
    .select(`
      *,
      location:locations(id, name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-red-600">{t('errors.serverError')}: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adjustments.title')}</h1>
          <p className="text-gray-600">{t('adjustments.newAdjustmentSubtitle')}</p>
        </div>
        <Link href="/adjustments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('adjustments.newAdjustment')}
          </Button>
        </Link>
      </div>

      <AdjustmentsTable data={adjustments || []} />
    </div>
  )
}
