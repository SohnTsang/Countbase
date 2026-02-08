import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { SuppliersTable } from '@/components/tables/suppliers-table'
import { getTranslator } from '@/lib/i18n/server'

export default async function SuppliersPage() {
  const supabase = await createClient()
  const t = await getTranslator()

  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name')

  if (error) {
    return <div className="text-red-600">{t('errors.serverError')}: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('suppliers.title')}</h1>
          <p className="text-gray-600">{t('suppliers.subtitle')}</p>
        </div>
        <Link href="/suppliers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('suppliers.newSupplier')}
          </Button>
        </Link>
      </div>

      <SuppliersTable data={suppliers || []} />
    </div>
  )
}
