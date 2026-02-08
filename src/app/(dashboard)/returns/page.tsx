import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ReturnsTable } from '@/components/tables/returns-table'
import { getTranslator } from '@/lib/i18n/server'

export default async function ReturnsPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: returns, error } = await supabase
    .from('returns')
    .select(`
      *,
      location:locations(id, name),
      lines:return_lines(qty)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-red-600">{t('errors.serverError')}: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('returns.title')}</h1>
          <p className="text-gray-600">{t('returns.subtitle')}</p>
        </div>
        <Link href="/returns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('returns.newReturn')}
          </Button>
        </Link>
      </div>

      <ReturnsTable data={returns || []} />
    </div>
  )
}
